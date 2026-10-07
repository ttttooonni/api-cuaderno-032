import { CURRENT_SCHEMA_VERSION } from '../data/constants'

export interface MigrationContext { db: IDBDatabase }
export interface Migration { from: number; to: number; id: string; run: (ctx: MigrationContext) => void }

export const migrations: Migration[] = [
  // V1 es el esquema inicial. Las siguientes versiones se añadirán sin reconstruir registros.
]

export function migrate(db: IDBDatabase, fromVersion: number, toVersion: number): void {
  let version = fromVersion
  while (version < toVersion) {
    const next = migrations.find(m => m.from === version)
    if (!next) throw new Error(`No existe migración ${version} → siguiente.`)
    next.run({ db })
    version = next.to
  }
  if (version !== CURRENT_SCHEMA_VERSION && toVersion === CURRENT_SCHEMA_VERSION) {
    throw new Error('La versión de datos solicitada no está completamente soportada.')
  }
}
