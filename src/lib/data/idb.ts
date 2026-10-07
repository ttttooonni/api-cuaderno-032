import { DB_NAME, DB_VERSION, STORE_NAMES } from './constants'
import type { StoreName } from '../../types/domain'

let opening: Promise<IDBDatabase> | undefined

function configure(db: IDBDatabase) {
  for (const name of STORE_NAMES) {
    if (!db.objectStoreNames.contains(name)) {
      const store = db.createObjectStore(name, { keyPath: 'id' })
      if (name === 'meta') store.createIndex('key', 'key', { unique: true })
      if (name === 'colonies') store.createIndex('apiaryId', 'apiaryId', { unique: false })
      if (name === 'actions') { store.createIndex('colonyId', 'colonyId'); store.createIndex('date', 'date') }
      if (name === 'treatments') { store.createIndex('colonyId', 'colonyId'); store.createIndex('date', 'date') }
      if (name === 'harvests') { store.createIndex('apiaryId', 'apiaryId'); store.createIndex('colonyId', 'colonyId'); store.createIndex('season', 'season') }
      if (name === 'tasks') { store.createIndex('status', 'status'); store.createIndex('date', 'date') }
      if (name === 'losses') { store.createIndex('colonyId', 'colonyId'); store.createIndex('date', 'date') }
      if (name === 'photos') store.createIndex('linkedEntityId', 'linkedEntity.id')
    }
  }
}

export function openDatabase(): Promise<IDBDatabase> {
  if (opening) return opening
  opening = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => configure(request.result)
    request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result) }
    request.onerror = () => { opening = undefined; reject(request.error ?? new Error('No se pudo abrir la base de datos')) }
    request.onblocked = () => reject(new Error('La actualización de datos está bloqueada por otra pestaña abierta.'))
  })
  return opening
}

export async function getAll<T>(storeName: StoreName): Promise<T[]> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const req = tx.objectStore(storeName).getAll()
    req.onsuccess = () => resolve(req.result as T[])
    req.onerror = () => reject(req.error)
  })
}

export async function put<T extends { id: string }>(storeName: StoreName, value: T): Promise<void> {
  const db = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    tx.objectStore(storeName).put(value)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error ?? new Error('Transacción abortada'))
  })
}

export async function remove(storeName: StoreName, id: string): Promise<void> {
  const db = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    tx.objectStore(storeName).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error ?? new Error('Transacción abortada'))
  })
}

export async function clearAndPut(storeName: StoreName, values: unknown[]): Promise<void> {
  const db = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    store.clear()
    for (const value of values) store.put(value)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error ?? new Error('Transacción abortada'))
  })
}
