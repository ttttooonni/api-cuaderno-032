import { APP_VERSION, CURRENT_SCHEMA_VERSION, STORE_NAMES } from '../data/constants'
import { getAll } from '../data/idb'
import type { BackupEnvelope, StoreName } from '../../types/domain'

export async function createBackup(): Promise<BackupEnvelope> {
  const stores: BackupEnvelope['database']['stores'] = {}
  for (const name of STORE_NAMES) stores[name as StoreName] = await getAll(name as StoreName)
  return {
    format: 'api-cuaderno-backup',
    formatVersion: 1,
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    database: { schemaVersion: CURRENT_SCHEMA_VERSION, stores },
  }
}

export function validateBackup(input: unknown): asserts input is BackupEnvelope {
  if (!input || typeof input !== 'object') throw new Error('Copia no válida.')
  const b = input as Partial<BackupEnvelope>
  if (b.format !== 'api-cuaderno-backup' || b.formatVersion !== 1) throw new Error('Formato de copia no compatible.')
  if (!b.database || typeof b.database !== 'object' || typeof b.database.schemaVersion !== 'number') throw new Error('La copia no contiene una base de datos válida.')
  const stores = (b.database as BackupEnvelope['database']).stores
  for (const [name, values] of Object.entries(stores)) {
    if (!STORE_NAMES.includes(name as StoreName)) continue
    if (!Array.isArray(values)) throw new Error(`El almacén ${name} no es válido.`)
    const ids = new Set<string>()
    for (const value of values) {
      if (!value || typeof value !== 'object' || typeof (value as { id?: unknown }).id !== 'string') throw new Error(`Registro inválido en ${name}.`)
      const id = (value as { id: string }).id
      if (ids.has(id)) throw new Error(`ID duplicado en ${name}: ${id}`)
      ids.add(id)
    }
  }
}

export function downloadBackup(backup: BackupEnvelope): void {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `api-cuaderno-backup-${new Date().toISOString().slice(0,10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}
