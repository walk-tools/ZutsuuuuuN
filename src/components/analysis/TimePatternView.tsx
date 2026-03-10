import { useState } from 'react'
import { analyzeTimePattern, type TimePatternResult } from '../../utils/analysis'
import AnalysisCard from './AnalysisCard'

export default function TimePatternView() {
  const [result, setResult] = useState<TimePatternResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await analyzeTimePattern()
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
          {/* サマリー */}
          <div className="glass rounded-2xl p-4">
            <p className="text-sm t-primary leading-relaxed">{result.summary}</p>
          </div>

          {/* ピーク時間帯 */}
          {result.peakHours.length > 0 && (
            <div className="glass rounded-2xl p-4">
              <p className="text-xs t-muted mb-2">⏰ ピーク時間帯</p>
              <div className="flex flex-wrap gap-2">
                {result.peakHours.map((h, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-500">
                    {h}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 曜日パターン */}
          {result.weekdayPattern && (
            <div className="glass rounded-2xl p-4">
              <p className="text-xs t-muted mb-1">📅 曜日パターン</p>
              <p className="text-sm t-primary">{result.weekdayPattern}</p>
            </div>
          )}

          {/* 片頭痛パターン */}
          {result.migrainePattern && (
            <div className="glass rounded-2xl p-4">
              <p className="text-xs t-muted mb-1">⚡ 片頭痛の傾向</p>
              <p className="text-sm t-primary">{result.migrainePattern}</p>
            </div>
          )}

          {/* 緊張性パターン */}
          {result.tensionPattern && (
            <div className="glass rounded-2xl p-4">
              <p className="text-xs t-muted mb-1">😣 緊張性頭痛の傾向</p>
              <p className="text-sm t-primary">{result.tensionPattern}</p>
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
        </div>
      )}
    </AnalysisCard>
  )
}
