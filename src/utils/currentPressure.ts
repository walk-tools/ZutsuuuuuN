import { db } from '../db'

async function getCoords(): Promise<{ lat: number; lon: number } | null> {
  const settings = await db.settings.get(1)
  if (settings?.latitude && settings?.longitude) {
    return { lat: settings.latitude, lon: settings.longitude }
  }

  if (!navigator.geolocation) return null

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Math.round(pos.coords.latitude * 100) / 100
        const lon = Math.round(pos.coords.longitude * 100) / 100
        resolve({ lat, lon })
      },
      () => resolve(null),
      { timeout: 10000 },
    )
  })
}

export async function getCurrentPressure(): Promise<number | undefined> {
  try {
    const coords = await getCoords()
    if (!coords) return undefined

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&hourly=surface_pressure&timezone=Asia/Tokyo&forecast_days=1`
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
