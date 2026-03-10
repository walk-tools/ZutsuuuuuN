import type { HeadacheType, Severity } from '../types'

export const TYPE_CONFIG: {
  value: HeadacheType
  label: string
  icon: string
}[] = [
  { value: 'migraine', label: '片頭痛', icon: '⚡' },
  { value: 'tension', label: '緊張性', icon: '😣' },
  { value: 'other', label: 'その他', icon: '🤕' },
]

export const SEVERITY_LEVELS: Severity[] = [1, 2, 3, 4, 5]

export const TYPE_LABEL: Record<HeadacheType, string> = {
  migraine: '⚡ 片頭痛',
  tension: '😣 緊張性',
  other: '🤕 その他',
}
