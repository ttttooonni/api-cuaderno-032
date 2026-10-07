import test from "node:test"
import assert from "node:assert/strict"

function materialFromHistory(history) {
  const result = { normal: 0, half: 0, halfSupers: 0, supers: 0 }
  for (const a of [...history].sort((x, y) => x.date.localeCompare(y.date))) {
    if (a.type !== "inventory-adjustment") continue
    const m = a.metadata || {}
    if (typeof m.normalFrames === "number") result.normal = m.normalFrames
    if (typeof m.halfFrames === "number") result.half = m.halfFrames
    if (typeof m.halfSupers === "number") result.halfSupers = m.halfSupers
    if (typeof m.supers === "number") result.supers = m.supers
  }
  return result
}

test("los registros antiguos siguen siendo válidos al añadir medias alzas", () => {
  const legacy = [{ date: "2026-01-01", type: "inventory-adjustment", metadata: { normalFrames: 10, halfFrames: 4, supers: 2 } }]
  assert.deepEqual(materialFromHistory(legacy), { normal: 10, half: 4, halfSupers: 0, supers: 2 })
})

test("media alza y cuadros de media alza permanecen separados", () => {
  const history = [{ date: "2026-01-01", type: "inventory-adjustment", metadata: { normalFrames: 10, halfFrames: 6, halfSupers: 2, supers: 1 } }]
  assert.deepEqual(materialFromHistory(history), { normal: 10, half: 6, halfSupers: 2, supers: 1 })
})
