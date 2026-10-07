import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { APP_VERSION } from '../lib/data/constants'
import { createBackup, downloadBackup } from '../lib/backup/backup'
import { repos } from '../lib/data/repository'
import { createRecord } from '../lib/data/factory'
import type { Action, Apiary, Colony, Harvest, InspectionAction, Queen, Task, Treatment } from '../types/domain'
import { UPDATE_EVENT } from '../lib/pwa/update'

type Page = 'Inicio' | 'Apiarios' | 'Colmenas' | 'Histórico' | 'Más'
type Modal = 'apiary' | 'colony' | 'inspection' | 'task' | 'queen' | 'treatment' | 'harvest' | 'material' | null

const today = () => new Date().toISOString().slice(0, 10)
const now = () => new Date().toISOString()

export function App() {
  const [page, setPage] = useState<Page>('Inicio')
  const [update, setUpdate] = useState(false)
  const [modal, setModal] = useState<Modal>(null)
  const [selectedColony, setSelectedColony] = useState<Colony | null>(null)
  const [counts, setCounts] = useState({ apiaries: 0, colonies: 0, nuclei: 0, harvests: 0, tasks: 0 })
  const [apiaries, setApiaries] = useState<Apiary[]>([])
  const [colonies, setColonies] = useState<Colony[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [history, setHistory] = useState<Action[]>([])
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [harvests, setHarvests] = useState<Harvest[]>([])
  const [queens, setQueens] = useState<Queen[]>([])
  const [message, setMessage] = useState('')

  async function refresh() {
    const [a, c, h, t, actionsList, treatmentsList, harvestList, queensList] = await Promise.all([
      repos.apiaries.list(), repos.colonies.list(), repos.harvests.list(), repos.tasks.list(), repos.actions.list(),
      repos.treatments.list(), repos.harvests.list(), repos.queens.list(),
    ])
    setApiaries(a.sort((x, y) => x.name.localeCompare(y.name)))
    setColonies(c.sort((x, y) => x.number.localeCompare(y.number, undefined, { numeric: true })))
    setTasks(t.sort((x, y) => x.date.localeCompare(y.date)))
    setHistory(actionsList.sort((x, y) => y.date.localeCompare(x.date)))
    setTreatments(treatmentsList.sort((x, y) => y.date.localeCompare(x.date)))
    setHarvests(harvestList.sort((x, y) => y.date.localeCompare(x.date)))
    setQueens(queensList.sort((x, y) => y.createdAt.localeCompare(x.createdAt)))
    setCounts({ apiaries: a.length, colonies: c.filter(x => x.kind === 'hive').length, nuclei: c.filter(x => x.kind === 'nucleus').length, harvests: h.length, tasks: t.filter(x => x.status === 'pending').length })
  }

  useEffect(() => {
    refresh().catch(() => setMessage('No se pudieron cargar los datos. No se han borrado.'))
    const fn = () => setUpdate(true)
    window.addEventListener(UPDATE_EVENT, fn)
    return () => window.removeEventListener(UPDATE_EVENT, fn)
  }, [])

  async function backup() { downloadBackup(await createBackup()); setMessage('Copia JSON completa preparada.') }

  async function saveApiary(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget)
    const record = createRecord({ name: String(data.get('name') || '').trim(), location: String(data.get('location') || '').trim(), description: String(data.get('description') || '').trim() }) as Apiary
    if (!record.name) return
    await repos.apiaries.save(record); setModal(null); await refresh(); setMessage('Apiario creado.')
  }

  async function saveColony(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget)
    const record = createRecord({ apiaryId: String(data.get('apiaryId')), kind: String(data.get('kind')) as Colony['kind'], number: String(data.get('number') || '').trim(), state: 'active' as Colony['state'], observations: String(data.get('observations') || '').trim() }) as Colony
    if (!record.number || !record.apiaryId) return
    await repos.colonies.save(record); setModal(null); await refresh(); setMessage('Unidad creada.')
  }

  async function saveInspection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selectedColony) return; const data = new FormData(event.currentTarget)
    const action = createRecord({ colonyId: selectedColony.id, date: String(data.get('date') || today()), type: 'inspection' as const,
      observations: String(data.get('observations') || '').trim(), metadata: {
        queenSeen: data.get('queenSeen') === 'yes', brood: String(data.get('brood') || 'good'), reserves: String(data.get('reserves') || '').trim(),
        strength: Number(data.get('strength') || 3) as 1 | 2 | 3 | 4 | 5, aggressiveness: String(data.get('aggressiveness') || '').trim(),
        varroa: { method: 'mites-per-100' as const, value: Number(data.get('varroa') || 0) },
      } }) as InspectionAction
    await repos.actions.save(action); setModal(null); await refresh(); setMessage('Inspección guardada en el histórico.')
  }

  async function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget)
    const task = createRecord({ title: String(data.get('title') || '').trim(), date: String(data.get('date') || today()), priority: String(data.get('priority') || 'normal') as Task['priority'], status: 'pending' as const,
      colonyId: String(data.get('colonyId') || '') || undefined, apiaryId: String(data.get('apiaryId') || '') || undefined, notes: String(data.get('notes') || '').trim() }) as Task
    if (!task.title) return
    await repos.tasks.save(task); setModal(null); await refresh(); setMessage('Tarea creada.')
  }

  async function completeTask(task: Task) { await repos.tasks.save({ ...task, status: 'done', updatedAt: now() }); await refresh() }

  async function saveQueen(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selectedColony) return; const data = new FormData(event.currentTarget)
    const queen = createRecord({ colonyId: selectedColony.id, identifier: String(data.get('identifier') || '').trim(), origin: String(data.get('origin') || '').trim(), introductionDate: String(data.get('introductionDate') || '') || undefined, race: String(data.get('race') || '').trim(), status: 'active' as const, observations: String(data.get('observations') || '').trim() }) as Queen
    await repos.queens.save(queen)
    await repos.actions.save(createRecord({ colonyId: selectedColony.id, date: queen.introductionDate || today(), type: 'queen-change' as const, observations: `Reina registrada${queen.identifier ? `: ${queen.identifier}` : ''}`, metadata: { queenId: queen.id, origin: queen.origin, race: queen.race } }) as Action)
    setModal(null); await refresh(); setMessage('Reina registrada y añadida al histórico.')
  }

  async function saveTreatment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selectedColony) return; const data = new FormData(event.currentTarget)
    const treatment = createRecord({ colonyId: selectedColony.id, product: String(data.get('product') || '').trim(), batch: String(data.get('batch') || '').trim() || undefined, date: String(data.get('date') || today()), dose: String(data.get('dose') || '').trim(), method: String(data.get('method') || '').trim(), withdrawalPeriod: String(data.get('withdrawalPeriod') || '').trim(), noHarvestBefore: String(data.get('noHarvestBefore') || '') || undefined, status: String(data.get('status') || 'applied') as Treatment['status'], observations: String(data.get('observations') || '').trim() }) as Treatment
    if (!treatment.product) return
    await repos.treatments.save(treatment)
    await repos.actions.save(createRecord({ colonyId: selectedColony.id, date: treatment.date, type: 'treatment' as const, observations: `${treatment.product}${treatment.batch ? ` · lote ${treatment.batch}` : ''}`, metadata: { treatmentId: treatment.id, noHarvestBefore: treatment.noHarvestBefore, status: treatment.status } }) as Action)
    setModal(null); await refresh(); setMessage('Tratamiento registrado y trazado.')
  }

  async function saveHarvest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selectedColony) return; const data = new FormData(event.currentTarget)
    const kg = Number(data.get('kg') || 0); if (!kg || kg < 0) return
    const harvest = createRecord({ colonyId: selectedColony.id, apiaryId: selectedColony.apiaryId, date: String(data.get('date') || today()), kg, batch: String(data.get('batch') || '').trim() || undefined, season: Number(data.get('season') || new Date().getFullYear()), observations: String(data.get('observations') || '').trim() }) as Harvest
    await repos.harvests.save(harvest)
    await repos.actions.save(createRecord({ colonyId: selectedColony.id, date: harvest.date, type: 'harvest' as const, observations: `${harvest.kg} kg${harvest.batch ? ` · lote ${harvest.batch}` : ''}`, metadata: { harvestId: harvest.id, kg: harvest.kg, batch: harvest.batch, season: harvest.season } }) as Action)
    setModal(null); await refresh(); setMessage('Cosecha registrada con trazabilidad.')
  }

  async function saveMaterial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selectedColony) return; const data = new FormData(event.currentTarget)
    const normal = Number(data.get('normal') || 0); const half = Number(data.get('half') || 0); const supers = Number(data.get('supers') || 0)
    const action = createRecord({ colonyId: selectedColony.id, date: String(data.get('date') || today()), type: 'inventory-adjustment' as const, observations: String(data.get('observations') || '').trim(), metadata: { normalFrames: normal, halfFrames: half, halfSupers: Number(data.get('halfSupers') || 0), supers, reason: 'manual-adjustment' } }) as Action
    await repos.actions.save(action); setModal(null); await refresh(); setMessage('Ajuste de material registrado sin borrar el histórico.')
  }

  async function saveMaterialValue(field: 'normal' | 'half' | 'halfSupers' | 'supers', value: number) {
    if (!selectedColony) return
    const next = { ...selectedMaterial, [field]: Math.max(0, Math.round(value)) }
    const action = createRecord({
      colonyId: selectedColony.id, date: today(), type: 'inventory-adjustment' as const,
      observations: `Ajuste rápido de material: ${field === 'normal' ? 'cuadros normales' : field === 'half' ? 'cuadros de media alza' : field === 'halfSupers' ? 'medias alzas' : 'alzas'}`,
      metadata: { normalFrames: next.normal, halfFrames: next.half, halfSupers: next.halfSupers, supers: next.supers, reason: 'quick-edit' },
    }) as Action
    await repos.actions.save(action)
    await refresh()
    setMessage('Material actualizado y cambio guardado en el histórico.')
  }

  async function editMaterialValue(field: 'normal' | 'half' | 'halfSupers' | 'supers', raw: string) {
    const value = Number(raw)
    if (!Number.isFinite(value) || value < 0) return
    await saveMaterialValue(field, value)
  }

  const selectedHistory = useMemo(() => selectedColony ? history.filter(x => x.colonyId === selectedColony.id) : [], [history, selectedColony])
  const selectedTreatments = useMemo(() => selectedColony ? treatments.filter(x => x.colonyId === selectedColony.id) : [], [treatments, selectedColony])
  const selectedHarvests = useMemo(() => selectedColony ? harvests.filter(x => x.colonyId === selectedColony.id) : [], [harvests, selectedColony])
  const selectedQueens = useMemo(() => selectedColony ? queens.filter(x => x.colonyId === selectedColony.id) : [], [queens, selectedColony])
  const selectedMaterial = useMemo(() => materialFromHistory(selectedHistory), [selectedHistory])

  return <div className="app">
    {update && <div className="update-banner"><strong>Hay una nueva versión de API-CUADERNO.</strong><button onClick={() => window.location.reload()}>Actualizar</button></div>}
    <header><button className="brand" onClick={() => { setPage('Inicio'); setSelectedColony(null) }}><span className="eyebrow">CUADERNO DE CAMPO APÍCOLA</span><h1>API-CUADERNO</h1></button><span className="version">v{APP_VERSION}</span></header>
    {message && <div className="toast" role="status" onClick={() => setMessage('')}>{message}</div>}
    <main>
      {page === 'Inicio' && <Home tasks={tasks} counts={counts} colonies={colonies} onTask={completeTask} onNewTask={() => setModal('task')} onOpenColony={setSelectedColony} onPage={setPage} />}
      {page === 'Apiarios' && <ApiariesPage apiaries={apiaries} colonies={colonies} onAdd={() => setModal('apiary')} />}
      {page === 'Colmenas' && !selectedColony && <ColoniesPage colonies={colonies} apiaries={apiaries} onAdd={() => setModal('colony')} onOpen={setSelectedColony} />}
      {page === 'Histórico' && <HistoryPage history={history} colonies={colonies} />}
      {page === 'Más' && <MorePage onBackup={backup} treatments={treatments} harvests={harvests} />}
      {selectedColony && <ColonyPage colony={selectedColony} apiaries={apiaries} history={selectedHistory} treatments={selectedTreatments} harvests={selectedHarvests} queens={selectedQueens} material={selectedMaterial} onBack={() => setSelectedColony(null)} onModal={setModal} onMaterialChange={saveMaterialValue} />}
    </main>
    <nav className="bottom-nav">{(['Inicio','Apiarios','Colmenas','Histórico','Más'] as Page[]).map(p => <button key={p} className={page === p && !selectedColony ? 'active' : ''} onClick={() => { setPage(p); setSelectedColony(null) }}>{p}</button>)}</nav>
    {modal === 'apiary' && <Modal title="Nuevo apiario" onClose={() => setModal(null)}><form onSubmit={saveApiary} className="form"><label>Nombre<input name="name" required autoFocus placeholder="Ej. La Finca" /></label><label>Ubicación<input name="location" placeholder="Municipio / zona" /></label><label>Descripción<textarea name="description" rows={3} /></label><button className="primary">Guardar apiario</button></form></Modal>}
    {modal === 'colony' && <Modal title="Nueva unidad" onClose={() => setModal(null)}><form onSubmit={saveColony} className="form"><label>Tipo<select name="kind"><option value="hive">Colmena</option><option value="nucleus">Núcleo</option></select></label><label>Apiario<select name="apiaryId" required><option value="">Selecciona…</option>{apiaries.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label><label>Número / identificador<input name="number" required placeholder="Ej. 24" /></label><label>Observaciones<textarea name="observations" rows={3} /></label><button className="primary">Guardar unidad</button></form></Modal>}
    {modal === 'inspection' && <Modal title="Inspección rápida" onClose={() => setModal(null)}><form onSubmit={saveInspection} className="form"><label>Fecha<input name="date" type="date" defaultValue={today()} required /></label><fieldset><legend>Reina</legend><div className="chips"><label><input type="radio" name="queenSeen" value="yes" defaultChecked /> Vista</label><label><input type="radio" name="queenSeen" value="no" /> No vista</label></div></fieldset><label>Cría<select name="brood" defaultValue="good"><option value="none">Nula</option><option value="irregular">Irregular</option><option value="good">Buena</option></select></label><label>Reservas<input name="reserves" placeholder="Buenas / medias / escasas" /></label><label>Fuerza <span className="field-value">1–5</span><input name="strength" type="range" min="1" max="5" defaultValue="3" /></label><label>Agresividad<input name="aggressiveness" placeholder="Baja / media / alta" /></label><label>Varroa · ácaros/100 abejas<input name="varroa" type="number" min="0" step="0.1" defaultValue="0" /></label><label>Observaciones<textarea name="observations" rows={4} /></label><button className="primary">Guardar inspección</button></form></Modal>}
    {modal === 'task' && <Modal title="Nueva tarea" onClose={() => setModal(null)}><form onSubmit={saveTask} className="form"><label>Tarea<input name="title" required autoFocus placeholder="Ej. Revisar colmena 24" /></label><label>Fecha<input name="date" type="date" defaultValue={today()} required /></label><label>Prioridad<select name="priority" defaultValue="normal"><option value="low">Baja</option><option value="normal">Normal</option><option value="high">Alta</option></select></label><label>Apiario<select name="apiaryId" defaultValue=""><option value="">Sin asignar</option>{apiaries.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label><label>Colmena / núcleo<select name="colonyId" defaultValue=""><option value="">Sin asignar</option>{colonies.map(c => <option key={c.id} value={c.id}>{c.kind === 'hive' ? 'Colmena' : 'Núcleo'} {c.number}</option>)}</select></label><label>Notas<textarea name="notes" rows={3} /></label><button className="primary">Crear tarea</button></form></Modal>}
    {modal === 'queen' && <Modal title="Registrar reina" onClose={() => setModal(null)}><form onSubmit={saveQueen} className="form"><label>Identificador<input name="identifier" placeholder="Ej. R-2026-04" /></label><label>Origen<input name="origin" placeholder="Criador / propia / rescate" /></label><label>Fecha de introducción<input name="introductionDate" type="date" defaultValue={today()} /></label><label>Raza / ecotipo<input name="race" placeholder="Ej. Negra canaria" /></label><label>Observaciones<textarea name="observations" rows={3} /></label><button className="primary">Guardar reina</button></form></Modal>}
    {modal === 'treatment' && <Modal title="Nuevo tratamiento" onClose={() => setModal(null)}><form onSubmit={saveTreatment} className="form"><label>Producto<input name="product" required /></label><label>Lote<input name="batch" /></label><label>Fecha<input name="date" type="date" defaultValue={today()} required /></label><label>Dosis<input name="dose" /></label><label>Método<input name="method" /></label><label>Plazo de supresión<input name="withdrawalPeriod" placeholder="Según ficha del producto" /></label><label>No cosechar antes de<input name="noHarvestBefore" type="date" /></label><label>Estado<select name="status"><option value="applied">Aplicado</option><option value="pending">Pendiente</option><option value="completed">Finalizado</option></select></label><label>Observaciones<textarea name="observations" rows={3} /></label><button className="primary">Guardar tratamiento</button></form></Modal>}
    {modal === 'harvest' && <Modal title="Registrar cosecha" onClose={() => setModal(null)}><form onSubmit={saveHarvest} className="form"><label>Fecha<input name="date" type="date" defaultValue={today()} required /></label><label>Kilos<input name="kg" type="number" min="0" step="0.01" required /></label><label>Lote<input name="batch" placeholder="Ej. MIEL-2026-01" /></label><label>Campaña<input name="season" type="number" defaultValue={new Date().getFullYear()} /></label><label>Observaciones<textarea name="observations" rows={3} /></label><button className="primary">Guardar cosecha</button></form></Modal>}
    {modal === 'material' && <Modal title="Ajuste de material" onClose={() => setModal(null)}><form onSubmit={saveMaterial} className="form"><p className="secondary-note">Se registra como ajuste histórico. Se mantienen separados: cuadros normales, cuadros de media alza, medias alzas y alzas.</p><label>Fecha<input name="date" type="date" defaultValue={today()} required /></label><label>Cuadros normales<input name="normal" type="number" min="0" step="1" defaultValue="0" /></label><label>Cuadros de media alza<input name="half" type="number" min="0" step="1" defaultValue="0" /></label><label>Medias alzas<input name="halfSupers" type="number" min="0" step="1" defaultValue="0" /></label><label>Alzas<input name="supers" type="number" min="0" step="1" defaultValue="0" /></label><label>Motivo / observaciones<textarea name="observations" rows={3} /></label><button className="primary">Guardar ajuste</button></form></Modal>}
  </div>
}

function Home({ tasks, counts, colonies, onTask, onNewTask, onOpenColony, onPage }: { tasks: Task[]; counts: typeof defaultCounts; colonies: Colony[]; onTask: (task: Task) => void; onNewTask: () => void; onOpenColony: (c: Colony) => void; onPage: (p: Page) => void }) {
  const pending = tasks.filter(t => t.status === 'pending').slice(0, 4)
  return <><section className="hero"><p>Que el apicultor sepa qué tiene, qué ha hecho, qué problemas existen y qué tiene que hacer después.</p><div className="offline">● Datos locales · preparado para trabajar sin conexión</div></section><section><div className="section-head"><h2>HOY</h2><button className="text-button" onClick={onNewTask}>+ Tarea</button></div>{pending.length === 0 ? <div className="empty">No hay tareas pendientes. El cuaderno está al día.</div> : <div className="task-list">{pending.map(t => <div className="task" key={t.id}><button onClick={() => onTask(t)}>○</button><div><strong>{t.title}</strong><small>{t.date} · {priorityLabel(t.priority)}</small></div></div>)}</div>}</section><section><h2>RESUMEN</h2><div className="grid">{[['Apiarios',counts.apiaries],['Colmenas',counts.colonies],['Núcleos',counts.nuclei],['Producciones',counts.harvests]].map(([label,value]) => <div className="card" key={String(label)}><span>{label}</span><strong>{value}</strong></div>)}</div></section><section><div className="section-head"><h2>ATENCIÓN</h2><button className="text-button" onClick={() => onPage('Colmenas')}>Ver todas</button></div>{colonies.filter(c => c.state === 'weak').slice(0, 3).map(c => <button className="attention" key={c.id} onClick={() => onOpenColony(c)}>⚠ {c.kind === 'hive' ? 'Colmena' : 'Núcleo'} {c.number}<small>Requiere revisión</small></button>)}{colonies.every(c => c.state !== 'weak') && <div className="empty">No hay unidades marcadas para atención.</div>}</section></>
}
const defaultCounts = { apiaries: 0, colonies: 0, nuclei: 0, harvests: 0, tasks: 0 }
function ApiariesPage({ apiaries, colonies, onAdd }: { apiaries: Apiary[]; colonies: Colony[]; onAdd: () => void }) { return <section><div className="section-head"><h2>APIARIOS</h2><button className="primary small" onClick={onAdd}>+ Nuevo</button></div>{apiaries.length === 0 ? <div className="empty">Todavía no tienes apiarios. Crea el primero.</div> : <div className="list">{apiaries.map(a => <article className="list-card" key={a.id}><div><strong>{a.name}</strong><small>{a.location || 'Sin ubicación'}</small></div><span>{colonies.filter(c => c.apiaryId === a.id).length} unidades</span></article>)}</div>}</section> }
function ColoniesPage({ colonies, apiaries, onAdd, onOpen }: { colonies: Colony[]; apiaries: Apiary[]; onAdd: () => void; onOpen: (c: Colony) => void }) { return <section><div className="section-head"><h2>COLMENAS Y NÚCLEOS</h2><button className="primary small" onClick={onAdd}>+ Nuevo</button></div>{colonies.length === 0 ? <div className="empty">Todavía no hay colmenas. Crea una desde aquí.</div> : <div className="list">{colonies.map(c => <button className="list-card clickable" key={c.id} onClick={() => onOpen(c)}><div><strong>{c.kind === 'hive' ? 'Colmena' : 'Núcleo'} {c.number}</strong><small>{apiaries.find(a => a.id === c.apiaryId)?.name || 'Apiario no encontrado'}</small></div><span className={`status ${c.state}`}>{stateLabel(c.state)}</span></button>)}</div>}</section> }
function ColonyPage({ colony, apiaries, history, treatments, harvests, queens, material, onBack, onModal, onMaterialChange }: { colony: Colony; apiaries: Apiary[]; history: Action[]; treatments: Treatment[]; harvests: Harvest[]; queens: Queen[]; material: MaterialState; onBack: () => void; onModal: (m: Modal) => void; onMaterialChange: (field: 'normal' | 'half' | 'halfSupers' | 'supers', value: number) => void }) {
  const apiary = apiaries.find(a => a.id === colony.apiaryId)
  const materialItems = [
    { key: 'normal' as const, label: 'Cuadros normales', value: material.normal },
    { key: 'half' as const, label: 'Cuadros de media alza', value: material.half },
    { key: 'halfSupers' as const, label: 'Medias alzas', value: material.halfSupers },
    { key: 'supers' as const, label: 'Alzas', value: material.supers },
  ]
  return <section><button className="back" onClick={onBack}>← Volver</button><div className="detail-head"><div><span className="eyebrow">{colony.kind === 'hive' ? 'COLMENA' : 'NÚCLEO'}</span><h2>{colony.number}</h2><p>{apiary?.name || 'Apiario no encontrado'}</p></div><button className="primary" onClick={() => onModal('inspection')}>+ Inspección</button></div><div className="quick-actions"><button onClick={() => onModal('queen')}>👑 Reina</button><button onClick={() => onModal('treatment')}>🩺 Sanidad</button><button onClick={() => onModal('harvest')}>🍯 Cosecha</button></div><div className="detail-grid"><div className="info"><span>Estado</span><strong>{stateLabel(colony.state)}</strong></div><div className="info"><span>Registros</span><strong>{history.length}</strong></div><div className="info"><span>Reinas</span><strong>{queens.length}</strong></div><div className="info"><span>Producción</span><strong>{harvests.reduce((s, h) => s + h.kg, 0).toFixed(2)} kg</strong></div></div><section className="subsection material-section"><div className="section-head"><div><h2>MATERIAL</h2><p className="section-hint">Edita directamente. Cada cambio queda guardado en el histórico.</p></div><button className="text-button" onClick={() => onModal('material')}>Ajuste</button></div><div className="material-grid">{materialItems.map(item => <MaterialEditor key={item.key} label={item.label} value={item.value} onMinus={() => onMaterialChange(item.key, item.value - 1)} onPlus={() => onMaterialChange(item.key, item.value + 1)} onSave={value => onMaterialChange(item.key, value)} />)}</div></section><section className="subsection"><h2>SANIDAD</h2>{treatments.length === 0 ? <div className="empty">Sin tratamientos registrados.</div> : <div className="list">{treatments.slice(0,4).map(t => <article className="list-card" key={t.id}><div><strong>{t.product}</strong><small>{t.date} · {t.batch ? `Lote ${t.batch} · ` : ''}{t.status}</small></div><span>{t.noHarvestBefore ? `No cosechar: ${t.noHarvestBefore}` : '—'}</span></article>)}</div>}</section><section className="subsection"><h2>HISTÓRICO</h2>{history.length === 0 ? <div className="empty">Todavía no hay acciones registradas.</div> : <div className="timeline">{history.map(a => <article key={a.id}><time>{a.date}</time><div><strong>{actionLabel(a.type)}</strong><p>{a.observations || 'Sin observaciones'}</p></div></article>)}</div>}</section><div className="secondary-note">QR será un identificador estable de la unidad, no una vía para exponer los datos locales.</div></section> }
function HistoryPage({ history, colonies }: { history: Action[]; colonies: Colony[] }) { return <section><h2>HISTÓRICO GENERAL</h2>{history.length === 0 ? <div className="empty">Aún no hay acciones históricas.</div> : <div className="timeline">{history.map(a => <article key={a.id}><time>{a.date}</time><div><strong>{actionLabel(a.type)} · {colonies.find(c => c.id === a.colonyId)?.number || 'Sin unidad'}</strong><p>{a.observations || 'Sin observaciones'}</p></div></article>)}</div>}</section> }
function MorePage({ onBackup, treatments, harvests }: { onBackup: () => void; treatments: Treatment[]; harvests: Harvest[] }) { const pendingTreatments = treatments.filter(t => t.status !== 'completed').length; const kg = harvests.reduce((s,h)=>s+h.kg,0); return <section><h2>MÁS</h2><div className="more-grid"><button className="more-card" onClick={onBackup}><strong>Datos</strong><span>Descargar copia JSON completa</span></button><div className="more-card"><strong>Sanidad</strong><span>{pendingTreatments} tratamientos pendientes o activos.</span></div><div className="more-card"><strong>Producción</strong><span>{kg.toFixed(2)} kg registrados en el cuaderno.</span></div><div className="more-card"><strong>Privacidad</strong><span>Los datos básicos permanecen en este dispositivo.</span></div><div className="more-card"><strong>Actualizaciones</strong><span>Las versiones importantes mostrarán aviso y protegerán los datos antes de migrar.</span></div></div></section> }
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) { return <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}><div className="modal" role="dialog" aria-modal="true" aria-label={title}><div className="modal-head"><h2>{title}</h2><button onClick={onClose} aria-label="Cerrar">×</button></div>{children}</div></div> }

function MaterialEditor({ label, value, onMinus, onPlus, onSave }: { label: string; value: number; onMinus: () => void; onPlus: () => void; onSave: (value: number) => void }) {
  const [draft, setDraft] = useState(String(value))
  useEffect(() => setDraft(String(value)), [value])
  function commit() {
    const next = Number(draft)
    if (!Number.isFinite(next) || next < 0) { setDraft(String(value)); return }
    const normalized = Math.round(next)
    setDraft(String(normalized))
    if (normalized !== value) onSave(normalized)
  }
  return <div className="material-card"><span>{label}</span><div className="material-value-row"><button type="button" className="stepper" onClick={onMinus} aria-label={`Restar ${label}`}>−</button><input className="material-value" type="number" min="0" step="1" value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit(); e.currentTarget.blur() } }} aria-label={label} /><button type="button" className="stepper" onClick={onPlus} aria-label={`Añadir ${label}`}>+</button></div></div>
}
function actionLabel(type: Action['type']) { return ({ inspection: 'Inspección', harvest: 'Cosecha', 'queen-change': 'Cambio de reina', 'frames-add': 'Añadir cuadros', 'frames-remove': 'Retirar cuadros', super: 'Alza', treatment: 'Tratamiento', split: 'División / núcleo', move: 'Movimiento', note: 'Nota', 'inventory-adjustment': 'Ajuste de inventario' } as Record<Action['type'], string>)[type] }
function priorityLabel(value: Task['priority']) { return value === 'high' ? 'Alta' : value === 'low' ? 'Baja' : 'Normal' }
function stateLabel(value: Colony['state']) { return ({ active:'Activa', weak:'Atención', lost:'Perdida', sold:'Vendida', inactive:'Inactiva' } as Record<Colony['state'], string>)[value] }
type MaterialState = { normal: number; half: number; halfSupers: number; supers: number }
function materialFromHistory(history: Action[]): MaterialState { const result = { normal: 0, half: 0, halfSupers: 0, supers: 0 }; for (const a of [...history].sort((x,y)=>x.date.localeCompare(y.date))) { if (a.type !== 'inventory-adjustment') continue; const m = a.metadata as Record<string, unknown> | undefined; if (!m) continue; if (typeof m.normalFrames === 'number') result.normal = m.normalFrames; if (typeof m.halfFrames === 'number') result.half = m.halfFrames; if (typeof m.halfSupers === 'number') result.halfSupers = m.halfSupers; if (typeof m.supers === 'number') result.supers = m.supers } return result }
