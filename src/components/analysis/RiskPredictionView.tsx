import { useState, useEffect } from 'react'
import { analyzeRiskPrediction, type RiskPredictionResult } from '../../utils/analysis'
import { usePressure } from '../../hooks/usePressure'
import AnalysisCard from './AnalysisCard'

const RISK_STYLE: Record<string, { icon: string; color: string; bg: string }> = {
  high: { icon: '🔴', color: 'text-red-500', bg: 'bg-red-500/10' },
  medium: { icon: '🟡', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  low: { icon: '🟢', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
}

export default function RiskPredictionView() {
  const { weekly, loading: pressureLoading } = usePressure()
  const [result, setResult] = useState<RiskPredictionResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 気圧予報から24時間分を抽出
  const [forecast24h, setForecast24h] = useState<{ time: string; pressure: number }[]>([])

  useEffect(() => {
    if (!weekly) return
    const now = new Date()
    const points: { time: string; pressure: number }[] = []
    for (const day of weekly.days) {
      for (const h of day.hourly) {
        const t = new Date(`${day.date}T${String(h.hour).padStart(2, '0')}:00:00`)
        if (t >= now && t <= new Date(now.getTime() + 24 * 60 * 60 * 1000)) {
          points.push({ time: t.toISOString(), pressure: h.pressure })
        }
      }
    }
    setForecast24h(points)
  }, [weekly])

  const run = async () => {
    if (forecast24h.length === 0) {
      setError('気圧予報データが取得できていません。位置情報を許可してください。')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const r = await analyzeRiskPrediction(forecast24h)
      setResult(r)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '分析に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  if (pressureLoading) {
    return (
      <div className="glass rounded-2xl p-6 text-center">
        <p className="t-muted text-sm">気圧データ取得中...</p>
      </div>
    )
  }

  const risk = result ? RISK_STYLE[result.overallRisk] : null

  return (
    <AnalysisCard loading={loading} error={error} onRun={run} hasResult={!!result}>
      {result && risk && (
        <div className="space-y-3">
          {/* リスクメーター */}
          <div className="glass rounded-2xl p-4 text-center">
            <p className="text-3xl mb-1">{risk.icon}</p>
            <p className={`text-2xl font-bold ${risk.color}`}>{result.riskPercent}%</p>
            <p className="text-xs t-muted mt-1">今後24時間の頭痛リスク</p>
            {/* プログレスバー */}
            <div className="mt-3 h-2 rounded-full t-bar-track overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${risk.bg.replace('/10', '/60')}`}
                style={{ width: `${result.riskPercent}%` }}
              />
            </div>
          </div>

          {/* 理由 */}
          <div className="glass rounded-2xl p-4">
            <p className="text-xs t-muted mb-1">予測根拠</p>
            <p className="text-sm t-primary">{result.reason}</p>
          </div>

          {/* 時間帯別リスク */}
          {result.timeSlots.length > 0 && (
            <div className="glass rounded-2xl p-4">
              <p className="text-xs t-muted mb-2">時間帯別</p>
              <div className="space-y-2">
                {result.timeSlots.map((slot, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="text-sm font-medium t-secondary">{slot.period}</span>
                    <span className="text-xs t-muted">{slot.risk}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 対策 */}
          {result.preventions.length > 0 && (
            <div className="glass rounded-2xl p-4 border border-emerald-400/20">
              <p className="text-xs t-muted mb-2">💊 予防策</p>
              <ul className="space-y-1.5">
                {result.preventions.map((p, i) => (
                  <li key={i} className="text-sm t-secondary flex gap-2">
                    <span className="text-emerald-400 flex-shrink-0">✓</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </AnalysisCard>
  )
}
