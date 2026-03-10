import { useEffect, useState } from 'react'
import { db } from '../db'

export type Theme = 'light' | 'dark'

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute('content', theme === 'dark' ? '#1a1625' : '#f8f6ff')
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    db.settings.get(1).then((s) => {
      const t = s?.theme ?? 'light'
      setTheme(t)
      applyTheme(t)
    })
  }, [])

  const toggle = async () => {
    const next: Theme = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    applyTheme(next)
    const settings = await db.settings.get(1)
    if (settings) {
      await db.settings.update(1, { theme: next })
    } else {
      await db.settings.put({
        id: 1,
        pressureThreshold: 6,
        theme: next,
      })
    }
  }

  return { theme, toggle }
}
