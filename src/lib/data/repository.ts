import { getAll, put, remove } from './idb'
import type { Action, Apiary, BaseRecord, Colony, Harvest, Loss, Photo, Queen, StoreName, Task, Treatment } from '../../types/domain'

export interface Repository<T extends BaseRecord> {
  list(): Promise<T[]>
  get(id: string): Promise<T | undefined>
  save(value: T): Promise<T>
  delete(id: string): Promise<void>
}

export function repository<T extends BaseRecord>(storeName: StoreName): Repository<T> {
  return {
    list: () => getAll<T>(storeName),
    async get(id) { return (await getAll<T>(storeName)).find(item => item.id === id) },
    async save(value) { await put(storeName, value); return value },
    delete: id => remove(storeName, id),
  }
}

export const repos = {
  apiaries: repository<Apiary>('apiaries'),
  colonies: repository<Colony>('colonies'),
  queens: repository<Queen>('queens'),
  actions: repository<Action>('actions'),
  treatments: repository<Treatment>('treatments'),
  harvests: repository<Harvest>('harvests'),
  tasks: repository<Task>('tasks'),
  losses: repository<Loss>('losses'),
  photos: repository<Photo>('photos'),
}
