import { useState } from 'react'
import type { HeadacheType, Severity } from '../types'
import { addRecord } from '../hooks/useRecords'
import { TYPE_CONFIG, SEVERITY_LEVELS } from '../utils/constants'

const typeActiveClass: Record<HeadacheType, string> = {
  migraine: 'bg-purple-500/15 border-purple-400 text-purple-600 shadow-purple-200/50',
  tension: 'bg-amber-500/15 border-amber-400 text-amber-600 shadow-amber-200/50',
  other: 'bg-slate-500/15 border-slate-400 text-slate-600 shadow-slate-200/50',
}

const severityActive: Record<number, string> = {
  1: 'bg-emerald-500/15 border-emerald-400 text-emerald-600',
  2: 'bg-lime-500/15 border-lime-400 text-lime-600',
  3: 'bg-yellow-500/15 border-yellow-400 text-yellow-600',
  4: 'bg-orange-500/15 border-orange-400 text-orange-600',
  5: 'bg-red-500/15 border-red-400 text-red-600',
}

interface Props {
  date: string
  onSaved: () => void
}

export default function RecordForm({ date, onSaved }: Props) {
  const [type, setType] = useState<HeadacheType | null>(null)
  const [severity, setSeverity] = useState<Severity | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!type || !severity) return
    setSaving(true)
    await addRecord(date, type, severity)
    setType(null)
    setSeverity(null)
    setSaving(false)
    onSaved()
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm t-secondary mb-2.5">どんな頭痛？</p>
        <div className="grid grid-cols-3 gap-2.5" role="radiogroup" aria-label="頭痛の種類">
          {TYPE_CONFIG.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setType(opt.value)}
              aria-pressed={type === opt.value}
              aria-label={opt.label}
              className={`py-4 rounded-2xl text-sm font-medium border transition-all active:scale-95 ${
                type === opt.value
                  ? `${typeActiveClass[opt.value]} shadow-lg scale-[1.03]`
                  : 't-btn-inactive'
              }`}
            >
              <div className="text-xl mb-1">{opt.icon}</div>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm t-secondary mb-2.5">どのくらい？</p>
        <div className="flex gap-2" role="radiogroup" aria-label="頭痛の程度">
          {SEVERITY_LEVELS.map((level) => (
            <button
              key={level}
              onClick={() => setSeverity(level)}
              aria-pressed={severity === level}
              aria-label={`程度 ${level}`}
              className={`flex-1 py-3.5 rounded-2xl font-semibold border transition-all active:scale-95 ${
                severity === level
                  ? `${severityActive[level]} shadow-lg scale-[1.03]`
                  : 't-btn-inactive'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
        <div className="flex justify-between text-xs t-muted mt-1.5 px-2">
          <span>軽い</span>
          <span>激しい</span>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={!type || !severity || saving}
        aria-busy={saving}
        className="w-full py-3.5 rounded-2xl font-semibold transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25"
      >
        {saving ? '記録中...' : '記録する'}
      </button>

      <p className="text-[11px] t-muted text-center">
        記録時刻と気圧が自動で保存されます
      </p>
    </div>
  )
}
