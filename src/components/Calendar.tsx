import type { HeadacheRecord } from '../types'
import { useRecordsByMonth } from '../hooks/useRecords'

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

interface Props {
  year: number
  month: number
  selectedDate: string | null
  onSelectDate: (date: string) => void
  onPrevMonth: () => void
  onNextMonth: () => void
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month - 1, 1).getDay()
}

function formatDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function getDotStyle(record: HeadacheRecord) {
  const baseColor =
    record.type === 'migraine'
      ? 'bg-purple-500'
      : record.type === 'tension'
        ? 'bg-amber-500'
        : 'bg-slate-400'

  const sizeMap: Record<number, string> = {
    1: 'w-1.5 h-1.5 opacity-50',
    2: 'w-2 h-2 opacity-65',
    3: 'w-2.5 h-2.5 opacity-75',
    4: 'w-3 h-3 opacity-90',
    5: 'w-3.5 h-3.5 opacity-100',
  }

  return `${baseColor} ${sizeMap[record.severity]} rounded-full`
}

export default function Calendar({
  year,
  month,
  selectedDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
}: Props) {
  const records = useRecordsByMonth(year, month)
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfWeek(year, month)

  const recordMap = new Map<string, HeadacheRecord[]>()
  if (records) {
    for (const r of records) {
      const list = recordMap.get(r.date) || []
      list.push(r)
      recordMap.set(r.date, list)
    }
  }

  const today = new Date()
  const todayStr = formatDate(today.getFullYear(), today.getMonth() + 1, today.getDate())

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div className="glass rounded-3xl p-4">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onPrevMonth}
          aria-label="前月"
          className="w-10 h-10 rounded-full flex items-center justify-center t-muted active:bg-purple-500/10 transition-colors"
        >
          ◀
        </button>
        <h2 className="text-lg font-semibold t-primary">
          {year}年{month}月
        </h2>
        <button
          onClick={onNextMonth}
          aria-label="次月"
          className="w-10 h-10 rounded-full flex items-center justify-center t-muted active:bg-purple-500/10 transition-colors"
        >
          ▶
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d, i) => (
          <div
            key={d}
            className={`text-center text-xs py-1.5 font-medium ${
              i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 't-muted'
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} className="aspect-square" />

          const dateStr = formatDate(year, month, day)
          const dayRecords = recordMap.get(dateStr)
          const isToday = dateStr === todayStr
          const isSelected = dateStr === selectedDate

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className={`aspect-square flex flex-col items-center justify-center rounded-xl text-sm transition-all active:scale-90 ${
                isSelected
                  ? 'bg-purple-500/15 ring-1 ring-purple-400/50'
                  : isToday
                    ? 'bg-purple-500/8'
                    : ''
              }`}
            >
              <span className={
                isToday ? 'text-purple-500 font-bold'
                : isSelected ? 'text-purple-500 font-semibold'
                : 't-primary'
              }>
                {day}
              </span>
              {dayRecords && dayRecords.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {dayRecords.map((r) => (
                    <div key={r.id} className={getDotStyle(r)} />
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
