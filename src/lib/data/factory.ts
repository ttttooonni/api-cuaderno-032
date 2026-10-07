import type { BaseRecord } from '../../types/domain'

export function createRecord<T extends Omit<BaseRecord, 'id' | 'createdAt' | 'updatedAt'>>(data: T): T & BaseRecord {
  const now = new Date().toISOString()
  return { ...data, id: crypto.randomUUID(), createdAt: now, updatedAt: now }
}
