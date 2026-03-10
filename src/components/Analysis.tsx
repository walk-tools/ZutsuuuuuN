import { useState } from 'react'
import CorrelationView from './analysis/CorrelationView'
import MonthlySummaryView from './analysis/MonthlySummaryView'
import RiskPredictionView from './analysis/RiskPredictionView'
import TimePatternView from './analysis/TimePatternView'
import TriggerView from './analysis/TriggerView'

type Tab = 'correlation' | 'monthly' | 'risk' | 'timePattern' | 'trigger'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'correlation', label: '気圧相関', icon: '📊' },
  { id: 'monthly', label: '月次', icon: '📋' },
  { id: 'risk', label: 'リスク', icon: '⚠' },
  { id: 'timePattern', label: '時間帯', icon: '🕐' },
  { id: 'trigger', label: 'トリガー', icon: '🔍' },
]

interface Props {
  onClose: () => void
}

export default function Analysis({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>('correlation')

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold t-primary">AI分析</h3>
        <button
          onClick={onClose}
          aria-label="閉じる"
          className="w-9 h-9 rounded-full glass flex items-center justify-center t-muted active:scale-90 transition-transform"
        >
          ✕
        </button>
      </div>

      {/* タブ */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-medium transition-all active:scale-95 ${
              tab === t.id
                ? 'bg-purple-500/15 text-purple-500 border border-purple-400/50'
                : 'glass t-muted'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* コンテンツ */}
      <div>
        {tab === 'correlation' && <CorrelationView />}
        {tab === 'monthly' && <MonthlySummaryView />}
        {tab === 'risk' && <RiskPredictionView />}
        {tab === 'timePattern' && <TimePatternView />}
        {tab === 'trigger' && <TriggerView />}
      </div>
    </div>
  )
}
