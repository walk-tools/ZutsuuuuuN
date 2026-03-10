import { useState } from 'react'
import { analyzeTriggers, type TriggerResult } from '../../utils/analysis'
import AnalysisCard from './AnalysisCard'

const CONFIDENCE_STYLE: Record<string, string> = {
  '高': 'text-red-500 bg-red-500/10',
  '中': 'text-amber-500 bg-amber-500/10',
  '低': 'text-slate-500 bg-slate-500/10',
}

export default function TriggerView() {
  const [result, setResult] = useState<TriggerResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await analyzeTriggers()
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

          {/* トップトリガー */}
          {result.topTriggers.length > 0 && (
            <div className="glass rounded-2xl p-4">
              <p className="text-xs t-muted mb-3">🎯 主なトリガー</p>
              <div className="space-y-3">
                {result.topTriggers.map((t, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${CONFIDENCE_STYLE[t.confidence] || 't-muted'}`}>
                      {t.confidence}
                    </span>
                    <div>
                      <p className="text-sm font-medium t-primary">{t.trigger}</p>
                      <p className="text-xs t-muted mt-0.5">{t.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 季節性 */}
          {result.seasonalPattern && result.seasonalPattern !== 'データ蓄積中' && (
            <div className="glass rounded-2xl p-4">
              <p className="text-xs t-muted mb-1">🌸 季節性パターン</p>
              <p className="text-sm t-primary">{result.seasonalPattern}</p>
            </div>
          )}

          {/* 周期性 */}
          {result.cyclicPattern && result.cyclicPattern !== 'データ蓄積中' && (
            <div className="glass rounded-2xl p-4">
              <p className="text-xs t-muted mb-1">🔄 周期性</p>
              <p className="text-sm t-primary">{result.cyclicPattern}</p>
            </div>
          )}

          {/* 長期トレンド */}
          {result.longTermTrend && result.longTermTrend !== 'データ蓄積中' && (
            <div className="glass rounded-2xl p-4">
              <p className="text-xs t-muted mb-1">📈 長期トレンド</p>
              <p className="text-sm t-primary">{result.longTermTrend}</p>
            </div>
          )}

          {/* 推奨 */}
          {result.recommendations.length > 0 && (
            <div className="glass rounded-2xl p-4 border border-emerald-400/20">
              <p className="text-xs t-muted mb-2">💡 対策</p>
              <ul className="space-y-1.5">
                {result.recommendations.map((r, i) => (
                  <li key={i} className="text-sm t-secondary flex gap-2">
                    <span className="text-emerald-400 flex-shrink-0">✓</span>
                    {r}
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
