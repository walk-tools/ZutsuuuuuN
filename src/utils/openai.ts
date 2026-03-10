import { db } from '../db'
import type { AnalysisType } from '../types'

import type { OpenAIModel } from '../types'

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
const DEFAULT_MODEL: OpenAIModel = 'gpt-4o-mini'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24時間

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

async function getSettings(): Promise<{ apiKey: string; model: OpenAIModel }> {
  const settings = await db.settings.get(1)
  const key = settings?.openaiApiKey
  if (!key) throw new Error('OpenAI APIキーが設定されていません。設定画面から入力してください。')
  return { apiKey: key, model: settings?.openaiModel ?? DEFAULT_MODEL }
}

export async function callOpenAI(messages: ChatMessage[]): Promise<string> {
  const { apiKey, model } = await getSettings()

  const res = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,
      max_tokens: 2000,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    if (res.status === 401) throw new Error('APIキーが無効です。設定画面で正しいキーを入力してください。')
    throw new Error(err.error?.message || `OpenAI API error: ${res.status}`)
  }

  const data = await res.json()
  return data.choices[0].message.content
}

export async function getCachedAnalysis(
  type: AnalysisType,
  key: string,
): Promise<string | null> {
  const cached = await db.analysisCache
    .where('key')
    .equals(`${type}:${key}`)
    .first()

  if (!cached) return null

  const age = Date.now() - cached.createdAt.getTime()
  if (age > CACHE_TTL_MS) {
    await db.analysisCache.delete(cached.id!)
    return null
  }

  return cached.result
}

export async function setCachedAnalysis(
  type: AnalysisType,
  key: string,
  result: string,
): Promise<void> {
  // 同じキーの古いキャッシュを削除
  const existing = await db.analysisCache
    .where('key')
    .equals(`${type}:${key}`)
    .toArray()
  if (existing.length > 0) {
    await db.analysisCache.bulkDelete(existing.map((e) => e.id!))
  }

  await db.analysisCache.add({
    type,
    key: `${type}:${key}`,
    result,
    createdAt: new Date(),
  })
}
