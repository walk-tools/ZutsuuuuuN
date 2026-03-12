import { useEffect, useState } from 'react'
import { db } from '../db'
import {
  fetchPressureForecast,
  analyzeWeeklyRisk,
  reverseGeocode,
  type PressureWeekly,
} from '../utils/pressure'

interface PressureState {
  weekly: PressureWeekly | null
  locationName: string
  loading: boolean
  error: string | null
  locationDenied: boolean
  threshold: number
}

const DEFAULT_THRESHOLD = 6

async function getLocation(): Promise<{ lat: number; lon: number } | null> {
  const settings = await db.settings.get(1)
  if (settings?.latitude && settings?.longitude) {
    return { lat: settings.latitude, lon: settings.longitude }
  }

  if (!navigator.geolocation) return null

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Math.round(pos.coords.latitude * 100) / 100
        const lon = Math.round(pos.coords.longitude * 100) / 100
        await db.settings.put({
          id: 1,
          latitude: lat,
          longitude: lon,
          pressureThreshold: settings?.pressureThreshold ?? DEFAULT_THRESHOLD,
          theme: settings?.theme ?? 'light',
        })
        resolve({ lat, lon })
      },
      () => resolve(null),
      { timeout: 10000 },
    )
  })
}

export function usePressure(): PressureState {
  const [state, setState] = useState<PressureState>({
    weekly: null,
    locationName: '',
    loading: true,
    error: null,
    locationDenied: false,
    threshold: DEFAULT_THRESHOLD,
  })

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const loc = await getLocation()
        if (cancelled) return

        if (!loc) {
          setState({ weekly: null, locationName: '', loading: false, error: null, locationDenied: true, threshold: DEFAULT_THRESHOLD })
          return
        }

        // 気圧データと地名を並行取得
        const [forecast, placeName] = await Promise.all([
          fetchPressureForecast(loc.lat, loc.lon),
          reverseGeocode(loc.lat, loc.lon),
        ])
        if (cancelled) return

        const settings = await db.settings.get(1)
        const threshold = settings?.pressureThreshold ?? DEFAULT_THRESHOLD
        const weekly = analyzeWeeklyRisk(forecast, threshold)

        setState({
          weekly,
          locationName: placeName,
          loading: false,
          error: null,
          locationDenied: false,
          threshold,
        })
      } catch (e) {
        if (cancelled) return
        setState({
          weekly: null,
          locationName: '',
          loading: false,
          error: e instanceof Error ? e.message : '取得に失敗しました',
          locationDenied: false,
          threshold: DEFAULT_THRESHOLD,
        })
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  return state
}
