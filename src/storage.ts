// Saving on the phone, and backup files.
// The data lives in this phone's browser storage for the app. A backup file is the safety net.
import { readData, type AppData } from './logic/data'
import { today } from './logic/dates'

const KEY = 'spending-app-data'

export function load(): AppData {
  try {
    const text = localStorage.getItem(KEY)
    return readData(text ? JSON.parse(text) : null)
  } catch {
    return readData(null)
  }
}

export function save(data: AppData): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

/** Asks the phone not to clear this app's storage when space runs low. */
export async function askToKeepData(): Promise<void> {
  try {
    await navigator.storage?.persist?.()
  } catch {
    /* not supported: fine */
  }
}

/** Makes a backup file. On iPhone this opens the Share sheet, so she can "Save to Files" (iCloud Drive). */
export async function backup(data: AppData): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const name = `spending-backup-${today()}.json`
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const file = new File([blob], name, { type: 'application/json' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Spending backup' })
      return 'shared'
    } catch {
      return 'cancelled'
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
  return 'downloaded'
}

/** Reads a backup file she picked. Throws if it isn't a backup. */
export async function readBackup(file: File): Promise<AppData> {
  const raw = JSON.parse(await file.text())
  if (!raw || typeof raw !== 'object' || !('purchases' in raw || 'moneyIn' in raw)) {
    throw new Error('not a backup')
  }
  return readData(raw)
}
