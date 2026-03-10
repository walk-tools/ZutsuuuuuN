import Dexie, { type Table } from 'dexie'
import type { HeadacheRecord, UserSettings, AnalysisCache } from '../types'

class ZutsuuDB extends Dexie {
  records!: Table<HeadacheRecord, number>
  settings!: Table<UserSettings, number>
  analysisCache!: Table<AnalysisCache, number>

  constructor() {
    super('zutsuu')

    this.version(1).stores({
      records: '++id, date',
      settings: 'id',
    })

    // v2: recordedAt, pressure, theme, openaiApiKey を追加
    this.version(2).stores({
      records: '++id, date',
      settings: 'id',
    }).upgrade((tx) => {
      return tx.table('records').toCollection().modify((record) => {
        if (!record.recordedAt) {
          const d = record.createdAt instanceof Date ? record.createdAt : new Date(record.createdAt)
          record.recordedAt = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
        }
      })
    })

    // v3: AI分析キャッシュテーブル追加
    this.version(3).stores({
      records: '++id, date',
      settings: 'id',
      analysisCache: '++id, type, key',
    })
  }
}

export const db = new ZutsuuDB()
