import { reactive } from 'vue'
import { canPlace } from '../data/items.js'

const CELL = 58   // 需与 CSS --cell-size 保持一致
const GAP  = 4    // 需与 CSS --cell-gap 保持一致

// ── 全局拖拽状态（单例，组件间共享）──────────────────────
export const dragState = reactive({
  active: false,
  item: null,           // 被拖物品的数据（含 instanceId、size 等）
  sourceType: null,     // 'shop' | 'grid' | 'backpack'
  sourceShopSlot: -1,
  sourceInstanceId: '',
  ghostX: 0,
  ghostY: 0,
  ghostW: CELL,
  ghostH: CELL,
  hoverCol: -1,
  hoverRow: -1,
  hoverValid: false,
  overSellZone: false,
  targetZone: null,     // 'formation' | 'backpack' | null
})

// ── 外部注入的回调（由 App.vue 通过 setCallbacks 提供）───
let onDropToGrid        = null
let onDropToSell        = null
let onDropToBackpack    = null
let onClickItem         = null
let getGridState        = null
let getBackpackState    = null
let getFormationLimits  = null   // () => { cols, rows }

export function setDragCallbacks({ dropToGrid, dropToSell, dropToBackpack, gridState, backpackGridState, clickItem, formationLimits }) {
  onDropToGrid       = dropToGrid
  onDropToSell       = dropToSell
  onDropToBackpack   = dropToBackpack ?? null
  getGridState       = gridState
  getBackpackState   = backpackGridState ?? null
  onClickItem        = clickItem ?? null
  getFormationLimits = formationLimits ?? null
}

// ── 计算 ghost 尺寸 ────────────────────────────────────
function ghostSize() {
  return { w: CELL, h: CELL }
}

// ── 单次 DOM 查询同时找出 slot、sellZone、targetZone ────
function findTargetAt(x, y) {
  const ghost = document.querySelector('.drag-ghost')
  if (ghost) ghost.style.display = 'none'
  const el = document.elementFromPoint(x, y)
  if (ghost) ghost.style.display = ''

  let slot = null
  let inSellZone = false
  let targetZone = null
  let cur = el
  while (cur && cur !== document.body) {
    if (!slot && cur.dataset?.grid === 'player') {
      slot = { col: parseInt(cur.dataset.col), row: parseInt(cur.dataset.row) }
      targetZone = 'formation'
    }
    if (!slot && cur.dataset?.grid === 'backpack') {
      slot = { col: parseInt(cur.dataset.col), row: parseInt(cur.dataset.row) }
      targetZone = 'backpack'
    }
    // 区域级检测：即使没落在具体格子上，也能识别所在区域（供商店物品模糊放置）
    if (!targetZone && cur.classList?.contains('formation-panel')) targetZone = 'formation'
    if (!targetZone && cur.classList?.contains('backpack-view'))   targetZone = 'backpack'
    if (!inSellZone && cur.classList?.contains('sell-zone'))
      inSellZone = true
    if (slot && inSellZone) break
    cur = cur.parentElement
  }
  return { slot, inSellZone, targetZone }
}

// ── 记录拖拽起点（用于区分"点击"和"拖拽"）────────────
let dragStartX = 0
let dragStartY = 0
let didMove    = false

// ── 开始拖拽（由子组件调用）────────────────────────────
export function startDrag(event, item, sourceType, sourceInfo) {
  const { w, h } = ghostSize()
  const isShop = sourceType === 'shop'

  Object.assign(dragState, {
    active: true, item, sourceType,
    sourceShopSlot:   isShop ? sourceInfo : -1,
    sourceInstanceId: isShop ? '' : sourceInfo,
    ghostW: w, ghostH: h,
    ghostX: event.clientX, ghostY: event.clientY,
    hoverCol: -1, hoverRow: -1, hoverValid: false, overSellZone: false,
    targetZone: null,
  })

  dragStartX = event.clientX
  dragStartY = event.clientY
  didMove    = false
  event.preventDefault?.()
}

// ── 全局指针移动 ─────────────────────────────────────
function onPointerMove(e) {
  if (!dragState.active) return
  const { clientX: cx, clientY: cy } = e
  dragState.ghostX = cx
  dragState.ghostY = cy

  if (!didMove && (Math.abs(cx - dragStartX) > 6 || Math.abs(cy - dragStartY) > 6))
    didMove = true

  const { slot, inSellZone, targetZone } = findTargetAt(cx, cy)
  dragState.targetZone = targetZone

  // 出售区：允许 grid 和 backpack 来源
  dragState.overSellZone = (dragState.sourceType === 'grid' || dragState.sourceType === 'backpack') && inSellZone

  if (slot) {
    dragState.hoverCol = slot.col
    dragState.hoverRow = slot.row

    // 根据目标区域选取对应 gridState，同区域内移动时临时移除源格子
    const isBackpackTarget = targetZone === 'backpack'
    const getState = isBackpackTarget ? getBackpackState : getGridState
    // 商店来源：落点合法性完全由 App.vue 购买逻辑处理，任何格子都视为有效
    if (dragState.sourceType === 'shop') {
      dragState.hoverValid = true
    } else if (getState) {
      let state = getState()
      const sameZone = (isBackpackTarget && dragState.sourceType === 'backpack') ||
                       (!isBackpackTarget && dragState.sourceType === 'grid')
      if (sameZone && dragState.sourceInstanceId) {
        state = state.map(row => row.map(cell =>
          cell === dragState.sourceInstanceId ? null : cell
        ))
      }
      if (isBackpackTarget) {
        dragState.hoverValid = canPlace(state, slot.col, slot.row)
      } else {
        const lim = getFormationLimits ? getFormationLimits() : { cols: 4, rows: 2 }
        dragState.hoverValid = canPlace(state, slot.col, slot.row, lim.cols, lim.rows)
      }
    } else {
      dragState.hoverValid = false
    }
  } else if (dragState.sourceType === 'shop' && targetZone !== null) {
    // 商店物品悬停在阵容/背包区域（未精确命中格子）→ 同样视为可放置，auto-place 由 tryBuyItem 处理
    dragState.hoverCol = -1
    dragState.hoverRow = -1
    dragState.hoverValid = true
  } else {
    dragState.hoverCol = -1
    dragState.hoverRow = -1
    dragState.hoverValid = false
  }
  e.preventDefault()
}

// ── 全局指针抬起 ─────────────────────────────────────
function onPointerUp(e) {
  if (!dragState.active) return

  const isClick = !didMove

  if (dragState.overSellZone && (dragState.sourceType === 'grid' || dragState.sourceType === 'backpack')) {
    onDropToSell?.(dragState.sourceInstanceId)
  } else if (!isClick && dragState.hoverValid &&
             (dragState.hoverCol >= 0 || dragState.sourceType === 'shop')) {
    if (dragState.targetZone === 'backpack') {
      onDropToBackpack?.(
        dragState.item, dragState.hoverCol, dragState.hoverRow,
        dragState.sourceType, dragState.sourceInstanceId, dragState.sourceShopSlot,
      )
    } else {
      onDropToGrid?.(
        dragState.item, dragState.hoverCol, dragState.hoverRow,
        dragState.sourceType, dragState.sourceInstanceId, dragState.sourceShopSlot,
      )
    }
  } else if (isClick && (dragState.sourceType === 'shop' || dragState.sourceType === 'grid')) {
    onClickItem?.(dragState.item, e.clientX, e.clientY)
  }

  Object.assign(dragState, {
    active: false, item: null,
    hoverCol: -1, hoverRow: -1, overSellZone: false, targetZone: null,
  })
  e.preventDefault()
}

// ── 强制取消拖拽（进入战斗时清除遗留状态）────────────
export function cancelDrag() {
  Object.assign(dragState, {
    active: false, item: null,
    hoverCol: -1, hoverRow: -1, overSellZone: false, targetZone: null,
  })
}

// ── 注册全局监听（只注册一次）────────────────────────
let _registered = false
export function registerGlobalListeners() {
  if (_registered) return
  _registered = true
  window.addEventListener('pointermove',   onPointerMove, { passive: false })
  window.addEventListener('pointerup',     onPointerUp,   { passive: false })
  window.addEventListener('pointercancel', onPointerUp,   { passive: false })
}
