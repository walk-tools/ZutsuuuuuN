import { useState } from 'react'
import { usePressure } from '../hooks/usePressure'
import type { DailyRisk, HourlyPoint } from '../utils/pressure'

const riskConfig = {
  high: {
    emoji: '🔴', label: '警戒', color: 'text-red-500',
    barColor: '#ef4444',
    banner: 'from-red-500/15 to-red-500/5 border-red-400/30',
  },
  medium: {
    emoji: '🟡', label: '注意', color: 'text-yellow-500',
    barColor: '#eab308',
    banner: 'from-yellow-500/15 to-yellow-500/5 border-yellow-400/30',
  },
  low: {
    emoji: '🟢', label: '安定', color: 'text-emerald-500',
    barColor: '#10b981',
    banner: 'from-emerald-500/10 to-emerald-500/5 border-emerald-400/20',
  },
}

function HourlyChart({ hourly }: { hourly: HourlyPoint[] }) {
  if (hourly.length === 0) return null

  const pressures = hourly.map((h) => h.pressure)
  const min = Math.min(...pressures)
  const max = Math.max(...pressures)
  const range = max - min || 1

  const width = 320
  const height = 100
  const padY = 12
  const usableH = height - padY * 2

  const points = hourly.map((h, i) => {
    const x = (i / (hourly.length - 1)) * width
    const y = padY + usableH - ((h.pressure - min) / range) * usableH
    return { x, y, hour: h.hour, pressure: h.pressure }
  })

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`

  return (
    <div className="mt-3 animate-fade-in">
      <div className="relative" style={{ height: height + 28 }}>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
          {[0.25, 0.5, 0.75].map((ratio) => (
            <line key={ratio} x1={0} y1={padY + usableH * (1 - ratio)} x2={width} y2={padY + usableH * (1 - ratio)} stroke="var(--grid-line)" strokeWidth={1} />
          ))}
          <path d={areaPath} fill="url(#pressureGrad)" opacity={0.4} />
          <path d={linePath} fill="none" stroke="url(#lineGrad)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          {(() => {
            const minPt = points.reduce((a, b) => a.pressure <= b.pressure ? a : b)
            return <circle cx={minPt.x} cy={minPt.y} r={4} fill="#ef4444" stroke="var(--bg-base)" strokeWidth={2} />
          })()}
          <defs>
            <linearGradient id="pressureGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a855f7" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1">
          {[0, 6, 12, 18].map((h) => (<span key={h} className="text-[10px] t-muted">{h}時</span>))}
          <span className="text-[10px] t-muted">24時</span>
        </div>
      </div>
      <div className="flex justify-between text-[10px] t-muted mt-1 px-1">
        <span>↓ {min} hPa</span>
        <span>↑ {max} hPa</span>
      </div>
    </div>
  )
}

function DayColumn({ day, isToday, isSelected, globalMin, globalMax, onClick }: {
  day: DailyRisk; isToday: boolean; isSelected: boolean; globalMin: number; globalMax: number; onClick: () => void
}) {
  const cfg = riskConfig[day.level]
  const range = globalMax - globalMin || 1
  const barBottom = ((day.minPressure - globalMin) / range) * 100
  const barTop = ((day.maxPressure - globalMin) / range) * 100
  const barHeight = Math.max(barTop - barBottom, 8)

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 py-2 px-1 rounded-2xl transition-all active:scale-95 ${
        isSelected ? 'glass-strong ring-1 ring-purple-400/40' : ''
      }`}
    >
      <span className={`text-[11px] font-medium ${isToday ? 'text-purple-500' : 't-muted'}`}>
        {isToday ? '今日' : day.weekday}
      </span>
      <span className={`text-sm font-semibold ${isToday ? 'text-purple-500' : 't-primary'}`}>
        {day.day}
      </span>
      <div className="w-2.5 h-16 t-bar-track rounded-full relative overflow-hidden">
        <div className="absolute left-0 right-0 rounded-full transition-all" style={{
          bottom: `${barBottom}%`, height: `${barHeight}%`, backgroundColor: cfg.barColor, opacity: 0.6,
        }} />
      </div>
      <span className="text-xs">{cfg.emoji}</span>
      {day.maxDrop > 0 ? (
        <span className={`text-[10px] font-medium ${cfg.color}`}>-{day.maxDrop}</span>
      ) : (
        <span className="text-[10px] t-muted">—</span>
      )}
    </button>
  )
}

export default function PressureAlert() {
  const { weekly, locationName, loading, error, locationDenied } = usePressure()
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)

  if (loading) {
    return (
      <div className="glass rounded-3xl p-4 animate-pulse">
        <div className="h-4 t-skeleton rounded w-40 mb-3" />
        <div className="flex gap-2 justify-between">
          {[...Array(7)].map((_, i) => <div key={i} className="w-10 h-28 t-skeleton rounded-2xl" />)}
        </div>
      </div>
    )
  }

  if (locationDenied) {
    return (
      <div className="glass rounded-3xl p-5 text-center">
        <p className="text-2xl mb-2">📍</p>
        <p className="text-sm t-secondary">位置情報を許可すると<br />気圧予報を表示できます</p>
      </div>
    )
  }

  if (error || !weekly) {
    return (
      <div className="glass rounded-3xl p-5 text-center">
        <p className="text-2xl mb-2">☁️</p>
        <p className="text-sm t-muted">気圧データを取得できませんでした</p>
      </div>
    )
  }

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const todayRisk = weekly.days[0]
  const todayStyle = todayRisk ? riskConfig[todayRisk.level] : null

  const allMin = Math.min(...weekly.days.map((d) => d.minPressure))
  const allMax = Math.max(...weekly.days.map((d) => d.maxPressure))
  const selectedDay = selectedIdx !== null ? weekly.days[selectedIdx] : null

  const locationLabel = locationName ? `${locationName}付近の気圧情報` : '現在地の気圧情報'

  return (
    <div className="space-y-3">
      {todayRisk && todayStyle && (
        <div className={`rounded-3xl border p-4 bg-gradient-to-br ${todayStyle.banner} glass`}>
          <div className="flex items-center gap-2.5 mb-2">
            <span className="text-lg">{todayStyle.emoji}</span>
            <div>
              <p className="text-sm font-medium t-primary">
                今日は<span className={`font-bold ${todayStyle.color}`}> {todayStyle.label}</span>
              </p>
              <p className="text-[11px] t-secondary mt-0.5">
                現在 {weekly.currentPressure} hPa
                {todayRisk.maxDrop > 0 && <span className={todayStyle.color}> · 最大 -{todayRisk.maxDrop} hPa</span>}
              </p>
            </div>
          </div>
          <p className="text-[11px] t-muted flex items-center gap-1">📍 {locationLabel}</p>
        </div>
      )}

      <div className="glass rounded-3xl p-4">
        <p className="text-xs t-muted mb-2 font-medium">7日間の気圧予報</p>
        <div className="grid grid-cols-7 gap-0.5">
          {weekly.days.map((day, i) => (
            <DayColumn key={day.date} day={day} isToday={day.date === todayStr} isSelected={selectedIdx === i}
              globalMin={allMin} globalMax={allMax} onClick={() => setSelectedIdx(selectedIdx === i ? null : i)} />
          ))}
        </div>
        {selectedDay && (
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--glass-border)' }}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs t-secondary font-medium">{selectedDay.label} の気圧変化</p>
              <span className={`text-xs ${riskConfig[selectedDay.level].color}`}>
                {riskConfig[selectedDay.level].emoji} {riskConfig[selectedDay.level].label}
              </span>
            </div>
            <HourlyChart hourly={selectedDay.hourly} />
          </div>
        )}
      </div>
    </div>
  )
}
