import { reactive } from 'vue'
import { canPlace } from '../data/items.js'
import { incrementStack } from './useMergeAnim.js'
import { showFlash } from '../utils.js'
import GC from '../../config/gameConfig.json'

const { MERGE_THRESHOLD, SELL_PRICE } = GC

// ── 格子尺寸 ──────────────────────────────────────────────
export const GRID_COLS = 5
export const BP_ROWS   = 2
export const BP_COLS   = 5

// ── 实例 ID 计数器（模块单例）────────────────────────────────
let _ic = 0
export const newId = () => `i${++_ic}`

// ── 创建实例 ──────────────────────────────────────────────
// instanceId: 传入则保留原 ID（移动场景），不传则生成新 ID（新建场景）
// stack: 传入则保留堆叠数，不传默认 1
export function mkInst(base, col, row, { instanceId = null, stack = 1 } = {}) {
  return reactive({
    ...base, instanceId: instanceId ?? newId(), col, row,
    stack,
    cooldownProgress: 0, burnStacks: 0, poisonStacks: 0,
    triggering: false,
  })
}

// ── 格子状态快照 ──────────────────────────────────────────
export function buildGridState(playerItems) {
  const s = [Array(GRID_COLS).fill(null)]
  for (const item of playerItems) {
    const c = item.col
    if (c >= 0 && c < GRID_COLS) s[0][c] = item.instanceId
  }
  return s
}

export function buildBackpackGridState(backpackItems) {
  const s = Array.from({ length: BP_ROWS }, () => Array(BP_COLS).fill(null))
  for (const item of backpackItems) {
    const r = item.row ?? 0, c = item.col
    if (r >= 0 && r < BP_ROWS && c >= 0 && c < BP_COLS) s[r][c] = item.instanceId
  }
  return s
}

// ── Composable（需要响应式状态作为参数）───────────────────────
export function useInventory({ playerItems, backpackItems, gold, phase, unlockedCols, mergeFlash }) {

  function findFreeSlot() {
    const state = buildGridState(playerItems)
    for (let c = 0; c < unlockedCols.value; c++)
      if (canPlace(state, c, 0, unlockedCols.value, 1)) return { col: c, row: 0 }
    return null
  }

  function findFreeBackpackSlot() {
    const state = buildBackpackGridState(backpackItems)
    for (let r = 0; r < BP_ROWS; r++)
      for (let c = 0; c < BP_COLS; c++)
        if (canPlace(state, c, r, BP_COLS, BP_ROWS)) return { col: c, row: r }
    return null
  }

  function findStackable(item) {
    return playerItems.find(i => i.id === item.id && i.tier === item.tier && i.stack < MERGE_THRESHOLD)
      ?? backpackItems.find(i => i.id === item.id && i.tier === item.tier && i.stack < MERGE_THRESHOLD)
      ?? null
  }

  function handleDropToGrid(item, col, row, sourceType, sourceInstanceId) {
    if (phase.value !== 'ARRANGE') return
    if (sourceType === 'grid') {
      const idx = playerItems.findIndex(i => i.instanceId === sourceInstanceId)
      if (idx === -1) return
      const srcCol = item.col, srcRow = item.row ?? 0
      playerItems.splice(idx, 1)
      const gridState = buildGridState(playerItems)
      const occupantId = gridState[row]?.[col]
      if (occupantId) {
        // 目标格有物品：互换位置
        const occupant = playerItems.find(i => i.instanceId === occupantId)
        if (occupant) { occupant.col = srcCol; occupant.row = srcRow }
      } else if (!canPlace(gridState, col, row, unlockedCols.value, 1)) {
        // 超出范围则回原位
        playerItems.push(mkInst(item, srcCol, srcRow, { instanceId: sourceInstanceId, stack: item.stack ?? 1 }))
        return
      }
      playerItems.push(mkInst(item, col, row, { instanceId: sourceInstanceId, stack: item.stack ?? 1 }))
    } else if (sourceType === 'backpack') {
      const idx = backpackItems.findIndex(i => i.instanceId === sourceInstanceId)
      if (idx === -1) return
      const existingInGrid = playerItems.find(i => i.id === item.id && i.tier === item.tier)
      if (existingInGrid) {
        backpackItems.splice(idx, 1)
        incrementStack(existingInGrid)
        return
      }
      const gridState = buildGridState(playerItems)
      const occupantId = gridState[row]?.[col]
      if (occupantId) {
        // 目标格有物品：互换——阵容物品移入背包原位，背包物品移入阵容
        const occupantIdx = playerItems.findIndex(i => i.instanceId === occupantId)
        if (occupantIdx === -1) return
        const occupant = playerItems[occupantIdx]
        playerItems.splice(occupantIdx, 1)
        backpackItems.splice(idx, 1)
        occupant.col = item.col
        occupant.row = item.row ?? 0
        backpackItems.push(occupant)
      } else {
        if (!canPlace(gridState, col, row, unlockedCols.value, 1)) return
        backpackItems.splice(idx, 1)
      }
      playerItems.push(mkInst(item, col, row, { instanceId: sourceInstanceId, stack: item.stack ?? 1 }))
    }
  }

  function handleDropToBackpack(item, col, row, sourceType, sourceInstanceId) {
    if (phase.value !== 'ARRANGE') return
    if (sourceType === 'grid') {
      const idx = playerItems.findIndex(i => i.instanceId === sourceInstanceId)
      if (idx === -1) return
      const existingInBackpack = backpackItems.find(i => i.id === item.id && i.tier === item.tier)
      if (existingInBackpack) {
        playerItems.splice(idx, 1)
        incrementStack(existingInBackpack)
        return
      }
      const bpState = buildBackpackGridState(backpackItems)
      const occupantId = bpState[row]?.[col]
      const srcCol = item.col, srcRow = item.row ?? 0
      if (occupantId) {
        // 目标背包格有物品：互换——背包物品移入阵容原位，阵容物品移入背包
        const occupantIdx = backpackItems.findIndex(i => i.instanceId === occupantId)
        if (occupantIdx === -1) return
        const occupant = backpackItems[occupantIdx]
        playerItems.splice(idx, 1)
        backpackItems.splice(occupantIdx, 1)
        occupant.col = srcCol; occupant.row = srcRow
        playerItems.push(occupant)
      } else {
        if (!canPlace(bpState, col, row, BP_COLS, BP_ROWS)) return
        playerItems.splice(idx, 1)
      }
      backpackItems.push(mkInst(item, col, row, { instanceId: sourceInstanceId, stack: item.stack ?? 1 }))
    } else if (sourceType === 'backpack') {
      const idx = backpackItems.findIndex(i => i.instanceId === sourceInstanceId)
      if (idx === -1) return
      const srcCol = item.col, srcRow = item.row ?? 0
      backpackItems.splice(idx, 1)
      const bpState = buildBackpackGridState(backpackItems)
      const occupantId = bpState[row]?.[col]
      if (occupantId) {
        // 目标格有物品：互换位置
        const occupant = backpackItems.find(i => i.instanceId === occupantId)
        if (occupant) { occupant.col = srcCol; occupant.row = srcRow }
      } else if (!canPlace(bpState, col, row, BP_COLS, BP_ROWS)) {
        backpackItems.push(mkInst(item, srcCol, srcRow, { instanceId: sourceInstanceId, stack: item.stack ?? 1 }))
        return
      }
      backpackItems.push(mkInst(item, col, row, { instanceId: sourceInstanceId, stack: item.stack ?? 1 }))
    }
  }

  function handleDropToSell(instanceId) {
    if (phase.value !== 'ARRANGE') return
    let idx = playerItems.findIndex(i => i.instanceId === instanceId)
    if (idx !== -1) { playerItems.splice(idx, 1); gold.value += SELL_PRICE; return }
    idx = backpackItems.findIndex(i => i.instanceId === instanceId)
    if (idx !== -1) { backpackItems.splice(idx, 1); gold.value += SELL_PRICE }
  }

  return {
    findFreeSlot, findFreeBackpackSlot, findStackable,
    handleDropToGrid, handleDropToBackpack, handleDropToSell,
  }
}
