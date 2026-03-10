import type { HeadacheRecord } from '../types'
import { callOpenAI, getCachedAnalysis, setCachedAnalysis } from './openai'
import type { ChatMessage } from './openai'
import { db } from '../db'

// ---------- データ準備 ----------

interface RecordSummary {
  date: string
  time: string
  type: string
  severity: number
  pressure?: number
}

function toSummary(records: HeadacheRecord[]): RecordSummary[] {
  return records.map((r) => ({
    date: r.date,
    time: r.recordedAt,
    type: r.type,
    severity: r.severity,
    pressure: r.pressure,
  }))
}

async function getAllRecords(): Promise<HeadacheRecord[]> {
  return db.records.orderBy('date').toArray()
}

async function getRecordsByMonth(year: number, month: number): Promise<HeadacheRecord[]> {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const end = month === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 1).padStart(2, '0')}-01`
  return db.records.where('date').between(start, end, true, false).toArray()
}

// ---------- システムプロンプト ----------

const SYSTEM_BASE = `あなたは頭痛管理アプリ「Zutsuu」のAI分析アシスタントです。
ユーザーの頭痛記録データを分析し、有用なインサイトを提供してください。
回答は日本語で、簡潔かつ具体的に。JSON形式で返してください。`

// ---------- 1. 気圧×頭痛 相関分析 ----------

export interface CorrelationResult {
  summary: string
  pressureSensitivity: string // "高い" "中程度" "低い" "データ不足"
  migraineThreshold?: string
  tensionCorrelation?: string
  insights: string[]
  recommendations: string[]
}

export async function analyzeCorrelation(): Promise<CorrelationResult> {
  const cacheKey = new Date().toISOString().slice(0, 10)
  const cached = await getCachedAnalysis('correlation', cacheKey)
  if (cached) return JSON.parse(cached)

  const records = await getAllRecords()
  if (records.length < 3) {
    return {
      summary: 'データが少なすぎます（3件以上の記録が必要です）',
      pressureSensitivity: 'データ不足',
      insights: ['記録を続けて、より正確な分析を行いましょう。'],
      recommendations: ['日々の頭痛を記録し続けてください。'],
    }
  }

  const data = toSummary(records)
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `${SYSTEM_BASE}
以下のJSON形式で返してください:
{
  "summary": "全体的な相関の要約（2-3文）",
  "pressureSensitivity": "高い" | "中程度" | "低い",
  "migraineThreshold": "片頭痛が起きやすい気圧条件の説明",
  "tensionCorrelation": "緊張性頭痛と気圧の関連性の説明",
  "insights": ["発見1", "発見2", ...],
  "recommendations": ["推奨1", "推奨2", ...]
}`,
    },
    {
      role: 'user',
      content: `以下は私の頭痛記録データです。気圧(hPa)と頭痛の相関を分析してください。
type: migraine=片頭痛, tension=緊張性, other=その他
severity: 1(軽い)〜5(激しい)

データ:
${JSON.stringify(data, null, 0)}`,
    },
  ]

  const raw = await callOpenAI(messages)
  const result = parseJsonResponse<CorrelationResult>(raw)
  await setCachedAnalysis('correlation', cacheKey, JSON.stringify(result))
  return result
}

// ---------- 2. 月次サマリー ----------

export interface MonthlySummaryResult {
  summary: string
  totalCount: number
  migraineCount: number
  tensionCount: number
  otherCount: number
  avgSeverity: number
  trend: string // "改善" "悪化" "横ばい" "初月"
  highlights: string[]
  advice: string
}

export async function analyzeMonthlySummary(
  year: number,
  month: number,
): Promise<MonthlySummaryResult> {
  const cacheKey = `${year}-${String(month).padStart(2, '0')}`
  const cached = await getCachedAnalysis('monthly', cacheKey)
  if (cached) return JSON.parse(cached)

  const records = await getRecordsByMonth(year, month)

  // 前月データも取得（比較用）
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  const prevRecords = await getRecordsByMonth(prevYear, prevMonth)

  if (records.length === 0) {
    return {
      summary: `${year}年${month}月の記録はありません。`,
      totalCount: 0,
      migraineCount: 0,
      tensionCount: 0,
      otherCount: 0,
      avgSeverity: 0,
      trend: '初月',
      highlights: [],
      advice: '頭痛が起きたら記録しましょう。',
    }
  }

  const data = toSummary(records)
  const prevData = toSummary(prevRecords)

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `${SYSTEM_BASE}
以下のJSON形式で返してください:
{
  "summary": "月の要約（2-3文、具体的な数値含む）",
  "totalCount": 合計件数,
  "migraineCount": 片頭痛の件数,
  "tensionCount": 緊張性の件数,
  "otherCount": その他の件数,
  "avgSeverity": 平均程度(小数点1桁),
  "trend": "改善" | "悪化" | "横ばい" | "初月",
  "highlights": ["特筆事項1", "特筆事項2", ...],
  "advice": "アドバイス（1文）"
}`,
    },
    {
      role: 'user',
      content: `${year}年${month}月の頭痛記録を分析してください。

今月のデータ:
${JSON.stringify(data, null, 0)}

前月（${prevYear}年${prevMonth}月）のデータ:
${prevData.length > 0 ? JSON.stringify(prevData, null, 0) : 'なし'}`,
    },
  ]

  const raw = await callOpenAI(messages)
  const result = parseJsonResponse<MonthlySummaryResult>(raw)
  await setCachedAnalysis('monthly', cacheKey, JSON.stringify(result))
  return result
}

// ---------- 3. パーソナルリスク予測 ----------

export interface RiskPredictionResult {
  overallRisk: 'high' | 'medium' | 'low'
  riskPercent: number
  reason: string
  timeSlots: { period: string; risk: string }[]
  preventions: string[]
}

export async function analyzeRiskPrediction(
  pressureForecast: { time: string; pressure: number }[],
): Promise<RiskPredictionResult> {
  const cacheKey = new Date().toISOString().slice(0, 13) // 1時間単位
  const cached = await getCachedAnalysis('risk', cacheKey)
  if (cached) return JSON.parse(cached)

  const records = await getAllRecords()
  if (records.length < 5) {
    return {
      overallRisk: 'low',
      riskPercent: 0,
      reason: 'データが不足しています（5件以上の記録が必要です）',
      timeSlots: [],
      preventions: ['記録を続けて予測精度を高めましょう。'],
    }
  }

  const data = toSummary(records)
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `${SYSTEM_BASE}
過去の頭痛記録パターンと今後24時間の気圧予報から、頭痛発生リスクを予測してください。
以下のJSON形式で返してください:
{
  "overallRisk": "high" | "medium" | "low",
  "riskPercent": リスク度合い(0-100),
  "reason": "予測の根拠（1-2文）",
  "timeSlots": [{"period": "時間帯", "risk": "リスク説明"}],
  "preventions": ["対策1", "対策2", ...]
}`,
    },
    {
      role: 'user',
      content: `私の頭痛記録:
${JSON.stringify(data, null, 0)}

今後24時間の気圧予報(hPa):
${JSON.stringify(pressureForecast, null, 0)}

これらのデータから頭痛リスクを予測してください。`,
    },
  ]

  const raw = await callOpenAI(messages)
  const result = parseJsonResponse<RiskPredictionResult>(raw)
  await setCachedAnalysis('risk', cacheKey, JSON.stringify(result))
  return result
}

// ---------- 4. 時間帯パターン ----------

export interface TimePatternResult {
  summary: string
  peakHours: string[]
  weekdayPattern: string
  migrainePattern: string
  tensionPattern: string
  insights: string[]
}

export async function analyzeTimePattern(): Promise<TimePatternResult> {
  const cacheKey = new Date().toISOString().slice(0, 10)
  const cached = await getCachedAnalysis('timePattern', cacheKey)
  if (cached) return JSON.parse(cached)

  const records = await getAllRecords()
  if (records.length < 5) {
    return {
      summary: 'データが不足しています（5件以上の記録が必要です）',
      peakHours: [],
      weekdayPattern: '',
      migrainePattern: '',
      tensionPattern: '',
      insights: ['記録を続けて、パターン分析を行いましょう。'],
    }
  }

  const data = toSummary(records)
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `${SYSTEM_BASE}
以下のJSON形式で返してください:
{
  "summary": "時間帯パターンの概要（2-3文）",
  "peakHours": ["最も頭痛が多い時間帯1", "時間帯2"],
  "weekdayPattern": "曜日別パターンの説明",
  "migrainePattern": "片頭痛の時間帯傾向",
  "tensionPattern": "緊張性頭痛の時間帯傾向",
  "insights": ["発見1", "発見2", ...]
}`,
    },
    {
      role: 'user',
      content: `以下は私の頭痛記録です。発生時間帯・曜日のパターンを分析してください。
（dateからDate曜日を導出して分析してください）

データ:
${JSON.stringify(data, null, 0)}`,
    },
  ]

  const raw = await callOpenAI(messages)
  const result = parseJsonResponse<TimePatternResult>(raw)
  await setCachedAnalysis('timePattern', cacheKey, JSON.stringify(result))
  return result
}

// ---------- 5. トリガー推論 ----------

export interface TriggerResult {
  summary: string
  topTriggers: { trigger: string; confidence: string; description: string }[]
  seasonalPattern: string
  cyclicPattern: string
  longTermTrend: string
  recommendations: string[]
}

export async function analyzeTriggers(): Promise<TriggerResult> {
  const cacheKey = new Date().toISOString().slice(0, 10)
  const cached = await getCachedAnalysis('trigger', cacheKey)
  if (cached) return JSON.parse(cached)

  const records = await getAllRecords()
  if (records.length < 10) {
    return {
      summary: 'データが不足しています（10件以上の記録でより正確な分析が可能です）',
      topTriggers: [],
      seasonalPattern: 'データ蓄積中',
      cyclicPattern: 'データ蓄積中',
      longTermTrend: 'データ蓄積中',
      recommendations: ['記録を継続して、トリガー分析の精度を高めましょう。'],
    }
  }

  const data = toSummary(records)
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `${SYSTEM_BASE}
以下のJSON形式で返してください:
{
  "summary": "トリガー分析の総合的な要約（2-3文）",
  "topTriggers": [
    {"trigger": "トリガー名", "confidence": "高" | "中" | "低", "description": "説明"}
  ],
  "seasonalPattern": "季節性パターンの説明",
  "cyclicPattern": "周期性パターンの説明（例: ○日周期など）",
  "longTermTrend": "長期的な傾向",
  "recommendations": ["具体的な対策1", "対策2", ...]
}`,
    },
    {
      role: 'user',
      content: `以下は私のすべての頭痛記録です。頭痛のトリガー（引き金）を総合的に推論してください。
気圧、時間帯、曜日、季節性、周期性、長期トレンドなどを包括的に分析してください。

データ:
${JSON.stringify(data, null, 0)}`,
    },
  ]

  const raw = await callOpenAI(messages)
  const result = parseJsonResponse<TriggerResult>(raw)
  await setCachedAnalysis('trigger', cacheKey, JSON.stringify(result))
  return result
}

// ---------- ヘルパー ----------

function parseJsonResponse<T>(raw: string): T {
  // ```json ... ``` を除去
  const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
  return JSON.parse(cleaned)
}
