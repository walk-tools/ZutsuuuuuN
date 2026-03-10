import { useState } from 'react'
import type { HeadacheRecord, HeadacheType, Severity } from '../types'
import {
  useRecordsByDate,
  updateRecord,
  deleteRecord,
} from '../hooks/useRecords'
import { TYPE_CONFIG, SEVERITY_LEVELS, TYPE_LABEL } from '../utils/constants'
import RecordForm from './RecordForm'

const typeColor: Record<HeadacheType, string> = {
  migraine: 'text-purple-500',
  tension: 'text-amber-500',
  other: 't-secondary',
}

const typeBorder: Record<HeadacheType, string> = {
  migraine: 'border-purple-400/30',
  tension: 'border-amber-400/30',
  other: '',
}

interface Props {
  date: string
  onClose: () => void
}

function EditableRecord({
  record,
  onDone,
}: {
  record: HeadacheRecord
  onDone: () => void
}) {
  const [type, setType] = useState<HeadacheType>(record.type)
  const [severity, setSeverity] = useState<Severity>(record.severity)

  const handleSave = async () => {
    await updateRecord(record.id!, { type, severity })
    onDone()
  }

  const handleDelete = async () => {
    await deleteRecord(record.id!)
    onDone()
  }

  return (
    <div className="glass rounded-2xl p-4 space-y-3 animate-pop-in">
      <div className="flex gap-2" role="radiogroup" aria-label="頭痛の種類">
        {TYPE_CONFIG.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setType(opt.value)}
            aria-pressed={type === opt.value}
            className={`flex-1 py-2.5 rounded-xl text-xs font-medium border transition-all active:scale-95 ${
              type === opt.value
                ? 'bg-purple-500/15 border-purple-400/50 text-purple-500'
                : 't-btn-inactive'
            }`}
          >
            {opt.icon} {opt.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2" role="radiogroup" aria-label="頭痛の程度">
        {SEVERITY_LEVELS.map((level) => (
          <button
            key={level}
            onClick={() => setSeverity(level)}
            aria-pressed={severity === level}
            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
              severity === level
                ? 'bg-purple-500/15 border-purple-400/50 text-purple-500'
                : 't-btn-inactive'
            }`}
          >
            {level}
          </button>
        ))}
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSave}
          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium active:scale-95 transition-transform"
        >
          更新
        </button>
        <button
          onClick={handleDelete}
          aria-label="記録を削除"
          className="py-2.5 px-4 rounded-xl bg-red-500/10 border border-red-400/30 text-red-500 text-sm active:scale-95 transition-transform"
        >
          削除
        </button>
        <button
          onClick={onDone}
          className="py-2.5 px-4 rounded-xl glass t-muted text-sm active:scale-95 transition-transform"
        >
          戻る
        </button>
      </div>
    </div>
  )
}

export default function DayDetail({ date, onClose }: Props) {
  const records = useRecordsByDate(date)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)

  const displayDate = (() => {
    const [, m, d] = date.split('-')
    const dateObj = new Date(date + 'T00:00:00')
    const weekday = ['日', '月', '火', '水', '木', '金', '土'][dateObj.getDay()]
    return `${Number(m)}月${Number(d)}日（${weekday}）`
  })()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold t-primary">{displayDate}</h3>
        <button
          onClick={onClose}
          aria-label="閉じる"
          className="w-9 h-9 rounded-full glass flex items-center justify-center t-muted active:scale-90 transition-transform"
        >
          ✕
        </button>
      </div>

      {records && records.length > 0 ? (
        <div className="space-y-2.5">
          {records.map((r) =>
            editingId === r.id ? (
              <EditableRecord
                key={r.id}
                record={r}
                onDone={() => setEditingId(null)}
              />
            ) : (
              <button
                key={r.id}
                onClick={() => setEditingId(r.id!)}
                aria-label={`${TYPE_LABEL[r.type]} 程度${r.severity} を編集`}
                className={`w-full text-left glass rounded-2xl p-4 border ${typeBorder[r.type]} active:scale-[0.98] transition-all`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${typeColor[r.type]}`}>
                    {TYPE_LABEL[r.type]}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5" aria-label={`程度 ${r.severity}/5`}>
                      {SEVERITY_LEVELS.map((i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full ${
                            i <= r.severity ? 'bg-purple-400' : 't-bar-track'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="t-muted text-xs">編集</span>
                  </div>
                </div>
                <div className="flex gap-3 mt-1.5 text-[11px] t-muted">
                  <span>{r.recordedAt || '—'}</span>
                  {r.pressure && <span>{r.pressure} hPa</span>}
                </div>
              </button>
            ),
          )}
        </div>
      ) : (
        !showForm && (
          <div className="glass rounded-2xl p-6 text-center">
            <p className="text-2xl mb-2">🌤</p>
            <p className="t-muted text-sm">頭痛なし — いい調子！</p>
          </div>
        )
      )}

      {showForm ? (
        <div className="glass rounded-2xl p-4 animate-pop-in">
          <RecordForm date={date} onSaved={() => setShowForm(false)} />
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          aria-label="記録を追加"
          className="w-full py-3.5 rounded-2xl border border-dashed t-muted text-sm active:scale-[0.98] transition-all"
          style={{ borderColor: 'var(--text-muted)' }}
        >
          ＋ 記録を追加
        </button>
      )}
    </div>
  )
}
