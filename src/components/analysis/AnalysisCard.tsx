interface Props {
  loading: boolean
  error: string | null
  onRun: () => void
  hasResult: boolean
  children: React.ReactNode
}

export default function AnalysisCard({ loading, error, onRun, hasResult, children }: Props) {
  return (
    <div className="space-y-3">
      {!hasResult && !loading && !error && (
        <div className="glass rounded-2xl p-6 text-center">
          <p className="text-2xl mb-2">🤖</p>
          <p className="t-muted text-sm mb-4">AIが頭痛データを分析します</p>
          <button
            onClick={onRun}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium active:scale-95 transition-transform shadow-lg shadow-purple-500/25"
          >
            分析を実行
          </button>
        </div>
      )}

      {loading && (
        <div className="glass rounded-2xl p-6 text-center">
          <div className="inline-block w-8 h-8 border-3 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-3" />
          <p className="t-muted text-sm">分析中...</p>
        </div>
      )}

      {error && (
        <div className="glass rounded-2xl p-4 border border-red-400/30">
          <p className="text-red-500 text-sm">{error}</p>
          <button
            onClick={onRun}
            className="mt-3 px-4 py-2 rounded-xl text-xs font-medium bg-red-500/10 text-red-500 active:scale-95 transition-transform"
          >
            再試行
          </button>
        </div>
      )}

      {hasResult && !loading && (
        <div className="animate-fade-in">
          {children}
          <button
            onClick={onRun}
            className="mt-3 w-full py-2.5 rounded-xl glass t-muted text-xs active:scale-95 transition-transform"
          >
            再分析
          </button>
        </div>
      )}
    </div>
  )
}
