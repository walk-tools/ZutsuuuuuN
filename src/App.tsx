import { useState } from 'react'
import Calendar from './components/Calendar'
import DayDetail from './components/DayDetail'
import RecordForm from './components/RecordForm'
import PressureAlert from './components/PressureAlert'
import Settings from './components/Settings'
import Analysis from './components/Analysis'
import { useTheme } from './hooks/useTheme'

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function SavedCheck() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none animate-fade-in">
      <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center animate-pop-in shadow-lg">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="4 12 10 18 20 6" className="animate-check" />
        </svg>
      </div>
    </div>
  )
}

type View = 'home' | 'detail' | 'settings' | 'analysis'

export default function App() {
  const { theme, toggle: toggleTheme } = useTheme()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [view, setView] = useState<View>('home')
  const [showRecordSheet, setShowRecordSheet] = useState(false)
  const [showSaved, setShowSaved] = useState(false)

  const handlePrevMonth = () => {
    if (month === 1) { setYear(year - 1); setMonth(12) }
    else setMonth(month - 1)
  }

  const handleNextMonth = () => {
    if (month === 12) { setYear(year + 1); setMonth(1) }
    else setMonth(month + 1)
  }

  const handleSelectDate = (date: string) => {
    setSelectedDate(date)
    setView('detail')
  }

  const handleSaved = () => {
    setShowRecordSheet(false)
    setShowSaved(true)
    setTimeout(() => setShowSaved(false), 1200)
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* ヘッダー */}
      <header className="sticky top-0 z-20 px-4 py-3 glass-strong">
        <div className="flex items-center justify-between max-w-md mx-auto">
          {view !== 'home' ? (
            <button
              onClick={() => { setView('home'); setSelectedDate(null) }}
              aria-label="戻る"
              className="w-9 h-9 rounded-full glass flex items-center justify-center t-muted active:scale-90 transition-transform text-sm"
            >
              ←
            </button>
          ) : (
            <div className="w-9" />
          )}
          <h1 className="text-lg font-semibold tracking-wide t-primary">
            ZutsuuuuuN!
          </h1>
          {view === 'home' ? (
            <div className="flex gap-1.5">
              <button
                onClick={() => setView('analysis')}
                aria-label="AI分析"
                className="w-9 h-9 rounded-full glass flex items-center justify-center t-muted active:scale-90 transition-transform text-sm"
              >
                🤖
              </button>
              <button
                onClick={() => setView('settings')}
                aria-label="設定"
                className="w-9 h-9 rounded-full glass flex items-center justify-center t-muted active:scale-90 transition-transform text-sm"
              >
                ⚙
              </button>
            </div>
          ) : (
            <div className="w-9" />
          )}
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pb-28">
        {view === 'analysis' ? (
          <div className="pt-4">
            <Analysis onClose={() => setView('home')} />
          </div>
        ) : view === 'settings' ? (
          <div className="pt-4">
            <Settings
              theme={theme}
              onToggleTheme={toggleTheme}
              onClose={() => setView('home')}
            />
          </div>
        ) : view === 'detail' && selectedDate ? (
          <div className="pt-4 animate-fade-in">
            <DayDetail date={selectedDate} onClose={() => { setView('home'); setSelectedDate(null) }} />
          </div>
        ) : (
          <>
            <div className="pt-4">
              <PressureAlert />
            </div>
            <div className="mt-4">
              <Calendar
                year={year}
                month={month}
                selectedDate={selectedDate}
                onSelectDate={handleSelectDate}
                onPrevMonth={handlePrevMonth}
                onNextMonth={handleNextMonth}
              />
            </div>
          </>
        )}
      </main>

      {/* FAB */}
      {view === 'home' && !showRecordSheet && (
        <button
          onClick={() => setShowRecordSheet(true)}
          aria-label="頭痛を記録"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30 flex items-center justify-center text-2xl font-light active:scale-90 transition-transform pb-safe"
        >
          +
        </button>
      )}

      {/* ボトムシート */}
      {showRecordSheet && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end">
          <div
            className="absolute inset-0 animate-fade-in"
            style={{ background: 'var(--overlay)' }}
            onClick={() => setShowRecordSheet(false)}
          />
          <div className="relative glass-strong rounded-t-3xl px-5 pt-4 pb-8 pb-safe animate-slide-up">
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: 'var(--text-muted)' }} />
            <p className="text-lg font-semibold t-primary mb-4">今の調子は？</p>
            <RecordForm date={todayStr()} onSaved={handleSaved} />
          </div>
        </div>
      )}

      {showSaved && <SavedCheck />}
    </div>
  )
}
