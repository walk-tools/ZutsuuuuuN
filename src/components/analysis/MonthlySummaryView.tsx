import { useState } from 'react'
import { analyzeMonthlySummary, type MonthlySummaryResult } from '../../utils/analysis'
import AnalysisCard from './AnalysisCard'

const TREND_BADGE: Record<string, { text: string; class: string }> = {
  '改善': { text: '↗ 改善', class: 'text-emerald-500 bg-emerald-500/10' },
  '悪化': { text: '↘ 悪化', class: 'text-red-500 bg-red-500/10' },
  '横ばい': { text: '→ 横ばい', class: 'text-amber-500 bg-amber-500/10' },
  '初月': { text: '🆕 初月', class: 't-muted bg-slate-500/10' },
}

export default function MonthlySummaryView() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [result, setResult] = useState<MonthlySummaryResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await analyzeMonthlySummary(year, month)
      setResult(r)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '分析に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handlePrev = () => {
    if (month === 1) { setYear(year - 1); setMonth(12) }
    else setMonth(month - 1)
    setResult(null)
  }

  const handleNext = () => {
    if (month === 12) { setYear(year + 1); setMonth(1) }
    else setMonth(month + 1)
    setResult(null)
  }

  return (
    <div className="space-y-3">
      {/* 月選択 */}
      <div className="flex items-center justify-center gap-4">
        <button onClick={handlePrev} className="w-9 h-9 rounded-full glass flex items-center justify-center t-muted active:scale-90 transition-transform">◀</button>
        <span className="text-sm font-semibold t-primary">{year}年{month}月</span>
        <button onClick={handleNext} className="w-9 h-9 rounded-full glass flex items-center justify-center t-muted active:scale-90 transition-transform">▶</button>
      </div>

      <AnalysisCard loading={loading} error={error} onRun={run} hasResult={!!result}>
        {result && (
          <div className="space-y-3">
            {/* トレンド + 件数 */}
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs t-muted">前月比</p>
                {TREND_BADGE[result.trend] && (
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${TREND_BADGE[result.trend].class}`}>
                    {TREND_BADGE[result.trend].text}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold t-primary">{result.totalCount}</p>
                  <p className="text-[10px] t-muted">合計</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-purple-500">{result.migraineCount}</p>
                  <p className="text-[10px] t-muted">片頭痛</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-amber-500">{result.tensionCount}</p>
                  <p className="text-[10px] t-muted">緊張性</p>
                </div>
                <div>
                  <p className="text-lg font-bold t-secondary">{result.otherCount}</p>
                  <p className="text-[10px] t-muted">その他</p>
                </div>
              </div>
              {result.avgSeverity > 0 && (
                <p className="text-xs t-muted text-center mt-2">
                  平均程度: <span className="font-semibold t-secondary">{result.avgSeverity}</span> / 5
                </p>
              )}
            </div>

            {/* サマリー */}
            <div className="glass rounded-2xl p-4">
              <p className="text-sm t-primary leading-relaxed">{result.summary}</p>
            </div>

            {/* 特筆事項 */}
            {result.highlights.length > 0 && (
              <div className="glass rounded-2xl p-4">
                <p className="text-xs t-muted mb-2">注目ポイント</p>
                <ul className="space-y-1.5">
                  {result.highlights.map((h, i) => (
                    <li key={i} className="text-sm t-secondary flex gap-2">
                      <span className="text-purple-400 flex-shrink-0">•</span>
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* アドバイス */}
            {result.advice && (
              <div className="glass rounded-2xl p-4 border border-emerald-400/20">
                <p className="text-xs t-muted mb-1">💡 アドバイス</p>
                <p className="text-sm t-primary">{result.advice}</p>
              </div>
            )}
          </div>
        )}
      </AnalysisCard>
    </div>
  )
}
