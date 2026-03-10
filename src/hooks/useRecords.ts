import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { HeadacheRecord, HeadacheType, Severity } from '../types'
import { getCurrentPressure } from '../utils/currentPressure'

export function useRecordsByMonth(year: number, month: number) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate =
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, '0')}-01`

  return useLiveQuery(
    () =>
      db.records
        .where('date')
        .between(startDate, endDate, true, false)
        .toArray(),
    [year, month],
  )
}

export function useRecordsByDate(date: string) {
  return useLiveQuery(() => db.records.where('date').equals(date).toArray(), [
    date,
  ])
}

export async function addRecord(
  date: string,
  type: HeadacheType,
  severity: Severity,
) {
  const now = new Date()
  const recordedAt = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  // 現在の気圧を取得（失敗しても記録は続行）
  const pressure = await getCurrentPressure()

  await db.records.add({
    date,
    type,
    severity,
    recordedAt,
    pressure,
    createdAt: now,
    updatedAt: now,
  })
}

export async function updateRecord(
  id: number,
  changes: Partial<Pick<HeadacheRecord, 'type' | 'severity'>>,
) {
  await db.records.update(id, { ...changes, updatedAt: new Date() })
}

export async function deleteRecord(id: number) {
  await db.records.delete(id)
}
