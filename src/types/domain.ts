export type ID = string
export type ISODate = string
export type ColonyKind = 'hive' | 'nucleus'
export type ColonyState = 'active' | 'weak' | 'lost' | 'sold' | 'inactive'
export type ActionType = 'inspection' | 'harvest' | 'queen-change' | 'frames-add' | 'frames-remove' | 'super' | 'treatment' | 'split' | 'move' | 'note' | 'inventory-adjustment'

export interface BaseRecord {
  id: ID
  createdAt: ISODate
  updatedAt: ISODate
  [key: string]: unknown
}

export interface Apiary extends BaseRecord {
  name: string
  location?: string
  latitude?: number
  longitude?: number
  description?: string
  photoId?: ID
}

export interface Colony extends BaseRecord {
  apiaryId: ID
  kind: ColonyKind
  number: string
  name?: string
  state: ColonyState
  photoId?: ID
  location?: string
  observations?: string
}

export interface Queen extends BaseRecord {
  colonyId: ID
  identifier?: string
  origin?: string
  introductionDate?: ISODate
  race?: string
  status?: 'active' | 'replaced' | 'lost' | 'unknown'
  observations?: string
}

export interface Action extends BaseRecord {
  colonyId: ID
  date: ISODate
  type: ActionType
  observations?: string
  metadata?: Record<string, unknown>
}

export interface InspectionAction extends Action {
  type: 'inspection'
  metadata?: {
    queenSeen?: boolean
    brood?: 'none' | 'irregular' | 'good'
    reserves?: string
    strength?: 1 | 2 | 3 | 4 | 5
    aggressiveness?: string
    varroa?: { method: 'mites-per-100' | 'drop' | 'none'; value?: number; observation?: string }
    [key: string]: unknown
  }
}

export interface Treatment extends BaseRecord {
  colonyId: ID
  product: string
  batch?: string
  date: ISODate
  dose?: string
  method?: string
  withdrawalPeriod?: string
  noHarvestBefore?: ISODate
  status: 'pending' | 'applied' | 'completed'
  observations?: string
}

export interface Harvest extends BaseRecord {
  colonyId?: ID
  apiaryId: ID
  date: ISODate
  kg: number
  batch?: string
  season: number
  observations?: string
}

export interface Task extends BaseRecord {
  title: string
  date: ISODate
  priority: 'low' | 'normal' | 'high'
  status: 'pending' | 'done'
  colonyId?: ID
  apiaryId?: ID
  notes?: string
}

export interface Loss extends BaseRecord {
  colonyId: ID
  date: ISODate
  reason: string
  observations?: string
}

export interface Photo extends BaseRecord {
  blob: Blob
  mimeType: string
  width?: number
  height?: number
  size: number
  linkedEntity?: { type: string; id: ID }
}

export interface AppMeta extends BaseRecord {
  key: string
  value: unknown
}

export type StoreName = 'meta' | 'apiaries' | 'colonies' | 'queens' | 'actions' | 'treatments' | 'harvests' | 'tasks' | 'losses' | 'photos'

export interface BackupEnvelope {
  format: 'api-cuaderno-backup'
  formatVersion: 1
  appVersion: string
  exportedAt: ISODate
  database: {
    schemaVersion: number
    stores: Partial<Record<StoreName, unknown[]>>
  }
}
