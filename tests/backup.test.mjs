import test from 'node:test'
import assert from 'node:assert/strict'

function validateBackup(input) {
  if (!input || typeof input !== 'object') throw new Error('Copia no válida.')
  if (input.format !== 'api-cuaderno-backup' || input.formatVersion !== 1) throw new Error('Formato de copia no compatible.')
  if (!input.database || typeof input.database.schemaVersion !== 'number') throw new Error('La copia no contiene una base de datos válida.')
  for (const [name, values] of Object.entries(input.database.stores ?? {})) {
    if (!Array.isArray(values)) throw new Error(`El almacén ${name} no es válido.`)
    const ids = new Set()
    for (const value of values) {
      if (!value || typeof value.id !== 'string') throw new Error(`Registro inválido en ${name}.`)
      if (ids.has(value.id)) throw new Error(`ID duplicado en ${name}: ${value.id}`)
      ids.add(value.id)
    }
  }
}

test('una copia válida conserva campos desconocidos', () => {
  const backup = {format:'api-cuaderno-backup',formatVersion:1,appVersion:'0.1.0',exportedAt:'2026-10-06T00:00:00Z',database:{schemaVersion:1,stores:{colonies:[{id:'c1',apiaryId:'a1',number:'24',futureField:'NO-BORRAR'}]}}}
  validateBackup(backup)
  assert.equal(backup.database.stores.colonies[0].futureField, 'NO-BORRAR')
})

test('rechaza IDs duplicados', () => {
  assert.throws(() => validateBackup({format:'api-cuaderno-backup',formatVersion:1,database:{schemaVersion:1,stores:{colonies:[{id:'c1'},{id:'c1'}]}}}))
})

test('rechaza copias con formato incorrecto', () => {
  assert.throws(() => validateBackup({format:'otro',formatVersion:1,database:{schemaVersion:1,stores:{}}}))
})
