import { db } from '../db'

export async function getCurrentPressure(): Promise<number | undefined> {
  try {
    const settings = await db.settings.get(1)
    if (!settings?.latitude || !settings?.longitude) return undefined

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${settings.latitude}&longitude=${settings.longitude}&hourly=surface_pressure&timezone=Asia/Tokyo&forecast_days=1`
    const res = await fetch(url)
    if (!res.ok) return undefined

    const data = await res.json()
    const now = new Date()
    const times: string[] = data.hourly.time
    const pressures: number[] = data.hourly.surface_pressure

    const idx = times.findIndex((t) => new Date(t) >= now)
    if (idx < 0) return undefined

    return Math.round(pressures[idx] * 10) / 10
  } catch {
    return undefined
  }
}
