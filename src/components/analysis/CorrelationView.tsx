import { useState } from 'react'
import { analyzeCorrelation, type CorrelationResult } from '../../utils/analysis'
import AnalysisCard from './AnalysisCard'

const SENSITIVITY_COLOR: Record<string, string> = {
  '高い': 'text-red-500 bg-red-500/10',
  '中程度': 'text-amber-500 bg-amber-500/10',
  '低い': 'text-emerald-500 bg-emerald-500/10',
  'データ不足': 't-muted bg-slate-500/10',
}

export default function CorrelationView() {
  const [result, setResult] = useState<CorrelationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await analyzeCorrelation()
      setResult(r)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '分析に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnalysisCard loading={loading} error={error} onRun={run} hasResult={!!result}>
      {result && (
        <div className="space-y-3">
          {/* 感度バッジ */}
          <div className="glass rounded-2xl p-4">
            <p className="text-xs t-muted mb-2">気圧感度</p>
            <span className={`inline-block px-3 py-1.5 rounded-full text-sm font-semibold ${SENSITIVITY_COLOR[result.pressureSensitivity] || 't-muted'}`}>
              {result.pressureSensitivity}
            </span>
          </div>

          {/* サマリー */}
          <div className="glass rounded-2xl p-4">
            <p className="text-sm t-primary leading-relaxed">{result.summary}</p>
          </div>

          {/* 片頭痛閾値 */}
          {result.migraineThreshold && (
            <div className="glass rounded-2xl p-4">
              <p className="text-xs t-muted mb-1">⚡ 片頭痛と気圧</p>
              <p className="text-sm t-primary">{result.migraineThreshold}</p>
            </div>
          )}

          {/* 緊張性 */}
          {result.tensionCorrelation && (
            <div className="glass rounded-2xl p-4">
              <p className="text-xs t-muted mb-1">😣 緊張性頭痛と気圧</p>
              <p className="text-sm t-primary">{result.tensionCorrelation}</p>
            </div>
          )}

          {/* インサイト */}
          {result.insights.length > 0 && (
            <div className="glass rounded-2xl p-4">
              <p className="text-xs t-muted mb-2">発見</p>
              <ul className="space-y-1.5">
                {result.insights.map((item, i) => (
                  <li key={i} className="text-sm t-secondary flex gap-2">
                    <span className="text-purple-400 flex-shrink-0">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 推奨 */}
          {result.recommendations.length > 0 && (
            <div className="glass rounded-2xl p-4">
              <p className="text-xs t-muted mb-2">アドバイス</p>
              <ul className="space-y-1.5">
                {result.recommendations.map((item, i) => (
                  <li key={i} className="text-sm t-secondary flex gap-2">
                    <span className="text-emerald-400 flex-shrink-0">✓</span>
                    {item}
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
