export type HeadacheType = 'migraine' | 'tension' | 'other'
export type Severity = 1 | 2 | 3 | 4 | 5

export interface HeadacheRecord {
  id?: number
  date: string // YYYY-MM-DD
  type: HeadacheType
  severity: Severity
  recordedAt: string // HH:mm
  pressure?: number // 記録時の気圧 (hPa)
  createdAt: Date
  updatedAt: Date
}

export type OpenAIModel = 'gpt-4o-mini' | 'gpt-4o' | 'gpt-4.1' | 'gpt-4.1-mini' | 'gpt-4.1-nano' | 'o3-mini'

export const OPENAI_MODELS: { value: OpenAIModel; label: string }[] = [
  { value: 'gpt-4o-mini', label: 'GPT-4o mini（低コスト）' },
  { value: 'gpt-4o', label: 'GPT-4o（高精度）' },
  { value: 'gpt-4.1-nano', label: 'GPT-4.1 nano（最安）' },
  { value: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
  { value: 'gpt-4.1', label: 'GPT-4.1（最高精度）' },
  { value: 'o3-mini', label: 'o3-mini（推論特化）' },
]

export interface UserSettings {
  id: 1
  latitude?: number
  longitude?: number
  pressureThreshold: number // デフォルト: 6 (hPa)
  theme: 'light' | 'dark'
  openaiApiKey?: string
  openaiModel?: OpenAIModel
}

export type AnalysisType =
  | 'correlation'
  | 'monthly'
  | 'risk'
  | 'timePattern'
  | 'trigger'

export interface AnalysisCache {
  id?: number
  type: AnalysisType
  key: string // 例: "correlation:2026-03" "monthly:2026-03"
  result: string // AI応答のJSON文字列
  createdAt: Date
}
