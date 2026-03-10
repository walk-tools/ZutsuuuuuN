export interface PressureForecast {
  time: string[] // ISO8601
  surfacePressure: number[] // hPa
}

export interface HourlyPoint {
  hour: number // 0-23
  pressure: number
}

export interface DailyRisk {
  date: string // YYYY-MM-DD
  label: string // "3/10(月)" 形式
  weekday: string // "月" etc
  day: number // 10 etc
  level: 'low' | 'medium' | 'high'
  maxDrop: number
  minPressure: number
  maxPressure: number
  avgPressure: number
  dropStartsAt: string | null
  hourly: HourlyPoint[]
}

export interface PressureWeekly {
  currentPressure: number
  days: DailyRisk[]
}

const API_BASE = 'https://api.open-meteo.com/v1/forecast'
const WEEKDAY = ['日', '月', '火', '水', '木', '金', '土']

export async function fetchPressureForecast(
  lat: number,
  lon: number,
): Promise<PressureForecast> {
  const url = `${API_BASE}?latitude=${lat}&longitude=${lon}&hourly=surface_pressure&timezone=Asia/Tokyo&forecast_days=7`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  const data = await res.json()
  return {
    time: data.hourly.time,
    surfacePressure: data.hourly.surface_pressure,
  }
}

export async function reverseGeocode(
  lat: number,
  lon: number,
): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10&accept-language=ja`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Zutsuu-PWA/1.0' },
    })
    if (!res.ok) return ''
    const data = await res.json()
    // city, town, village, county の順で取得
    const addr = data.address
    return (
      addr.city || addr.town || addr.village || addr.county || addr.state || ''
    )
  } catch {
    return ''
  }
}

export function analyzeWeeklyRisk(
  forecast: PressureForecast,
  threshold: number,
): PressureWeekly {
  const now = new Date()
  const currentIdx = forecast.time.findIndex((t) => new Date(t) >= now)
  const currentPressure =
    currentIdx >= 0
      ? Math.round(forecast.surfacePressure[currentIdx] * 10) / 10
      : 0

  // 日ごとにグループ化
  const dayMap = new Map<string, { indices: number[] }>()
  for (let i = 0; i < forecast.time.length; i++) {
    const date = forecast.time[i].slice(0, 10)
    if (!dayMap.has(date)) dayMap.set(date, { indices: [] })
    dayMap.get(date)!.indices.push(i)
  }

  const days: DailyRisk[] = []

  for (const [date, { indices }] of dayMap) {
    const dateObj = new Date(date + 'T00:00:00')
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    if (dateObj < todayStart) continue

    // hourly データ
    const hourly: HourlyPoint[] = indices.map((idx) => ({
      hour: new Date(forecast.time[idx]).getHours(),
      pressure: Math.round(forecast.surfacePressure[idx] * 10) / 10,
    }))

    // 統計
    const pressures = indices.map((idx) => forecast.surfacePressure[idx])
    const sum = pressures.reduce((a, b) => a + b, 0)
    const avgPressure = Math.round((sum / pressures.length) * 10) / 10
    const minPressure = Math.round(Math.min(...pressures) * 10) / 10
    const maxPressure = Math.round(Math.max(...pressures) * 10) / 10

    // 6時間窓での最大低下
    let maxDrop = 0
    let dropStartsAt: string | null = null
    const start = indices[0]
    const end = Math.min(
      indices[indices.length - 1] + 1,
      forecast.surfacePressure.length,
    )

    for (let i = start; i < end; i++) {
      const windowEnd = Math.min(i + 6, forecast.surfacePressure.length)
      for (let j = i + 1; j < windowEnd; j++) {
        const drop = forecast.surfacePressure[i] - forecast.surfacePressure[j]
        if (drop > maxDrop) {
          maxDrop = drop
          dropStartsAt = forecast.time[i]
        }
      }
    }

    maxDrop = Math.round(maxDrop * 10) / 10
    const level =
      maxDrop >= threshold
        ? 'high'
        : maxDrop >= threshold * 0.6
          ? 'medium'
          : 'low'

    const d = new Date(date + 'T00:00:00')
    const weekday = WEEKDAY[d.getDay()]
    const label = `${d.getMonth() + 1}/${d.getDate()}(${weekday})`

    days.push({
      date,
      label,
      weekday,
      day: d.getDate(),
      level,
      maxDrop,
      minPressure,
      maxPressure,
      avgPressure,
      dropStartsAt,
      hourly,
    })
  }

  return { currentPressure, days: days.slice(0, 7) }
}
