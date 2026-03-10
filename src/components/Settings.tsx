import { useState, useEffect } from 'react'
import { db } from '../db'
import type { Theme } from '../hooks/useTheme'
import { OPENAI_MODELS, type OpenAIModel } from '../types'

interface Props {
  theme: Theme
  onToggleTheme: () => void
  onClose: () => void
}

export default function Settings({ theme, onToggleTheme, onClose }: Props) {
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState<OpenAIModel>('gpt-4o-mini')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    db.settings.get(1).then((s) => {
      if (s?.openaiApiKey) setApiKey(s.openaiApiKey)
      if (s?.openaiModel) setModel(s.openaiModel)
    })
  }, [])

  const handleSave = async () => {
    const settings = await db.settings.get(1)
    if (settings) {
      await db.settings.update(1, { openaiApiKey: apiKey || undefined, openaiModel: model })
    } else {
      await db.settings.put({
        id: 1,
        pressureThreshold: 6,
        theme,
        openaiApiKey: apiKey || undefined,
        openaiModel: model,
      })
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold t-primary">設定</h3>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full glass flex items-center justify-center t-muted active:scale-90 transition-transform"
        >
          ✕
        </button>
      </div>

      {/* テーマ切替 */}
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium t-primary">テーマ</p>
            <p className="text-xs t-muted mt-0.5">
              {theme === 'light' ? 'ライトモード' : 'ダークモード'}
            </p>
          </div>
          <button
            onClick={onToggleTheme}
            className="w-14 h-8 rounded-full relative transition-colors"
            style={{
              background: theme === 'dark'
                ? 'linear-gradient(135deg, #6366f1, #a855f7)'
                : '#e2e8f0',
            }}
          >
            <div
              className="absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all"
              style={{ left: theme === 'dark' ? '1.75rem' : '0.25rem' }}
            />
            <span className="absolute inset-0 flex items-center justify-center text-xs">
              {theme === 'light' ? '☀️' : '🌙'}
            </span>
          </button>
        </div>
      </div>

      {/* OpenAI API Key */}
      <div className="glass rounded-2xl p-4 space-y-3">
        <div>
          <p className="text-sm font-medium t-primary">OpenAI API Key</p>
          <p className="text-xs t-muted mt-0.5">
            頭痛と気圧の相関をAIで分析するために使用します
          </p>
        </div>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-..."
          className="w-full px-4 py-3 rounded-xl text-sm t-input border outline-none focus:ring-2 focus:ring-purple-400/50 transition-all"
        />
        <div>
          <p className="text-sm font-medium t-primary mb-1.5">モデル</p>
          <div className="grid grid-cols-2 gap-1.5">
            {OPENAI_MODELS.map((m) => (
              <button
                key={m.value}
                onClick={() => setModel(m.value)}
                className={`px-3 py-2.5 rounded-xl text-xs font-medium border transition-all active:scale-95 text-left ${
                  model === m.value
                    ? 'bg-purple-500/15 border-purple-400/50 text-purple-500'
                    : 't-btn-inactive'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium active:scale-95 transition-transform"
          >
            保存
          </button>
          {saved && (
            <span className="text-xs text-emerald-500 font-medium animate-fade-in">
              保存しました
            </span>
          )}
        </div>
        <p className="text-[11px] t-muted">
          APIキーは端末のIndexedDBにのみ保存され、外部に送信されません（OpenAI API呼び出し時を除く）
        </p>
      </div>
    </div>
  )
}
