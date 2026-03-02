<template>
  <!-- compact=true 时不显示槽位背景，物品直接浮动 -->
  <div class="grid-container" :class="{ compact: compact }" :style="containerStyle">
    <!-- 背景槽位（仅商店/非紧凑模式） -->
    <div v-if="!compact" class="grid-slots" :style="slotsGridStyle">
      <div
        v-for="(slot, idx) in slots"
        :key="idx"
        class="grid-slot"
        :class="slotClass(slot.row, slot.col)"
        :data-grid="isEnemy ? 'enemy' : props.zone"
        :data-row="slot.row"
        :data-col="slot.col"
      ></div>
    </div>

    <!-- 拖拽槽位（compact 时仍然需要 drop target，但不可见）-->
    <div v-else class="grid-slots ghost-slots" :style="slotsGridStyle">
      <div
        v-for="(slot, idx) in slots"
        :key="idx"
        class="grid-slot ghost"
        :class="slotClass(slot.row, slot.col)"
        :data-grid="isEnemy ? 'enemy' : props.zone"
        :data-row="slot.row"
        :data-col="slot.col"
      ></div>
    </div>

    <!-- 相邻连线 SVG（非紧凑时显示） -->
    <svg
      v-if="!compact"
      class="adjacency-svg"
      :width="svgW" :height="svgH"
      style="position:absolute;top:0;left:0;pointer-events:none;overflow:visible"
    >
      <g v-for="link in adjacencyLinks" :key="link.key">
        <line :x1="link.x1" :y1="link.y1" :x2="link.x2" :y2="link.y2"
          :stroke="link.color" :stroke-width="link.glow ? 6 : 3"
          :stroke-opacity="link.glow ? 0.25 : 0.12" stroke-linecap="round" />
        <line :x1="link.x1" :y1="link.y1" :x2="link.x2" :y2="link.y2"
          :stroke="link.color" :stroke-width="link.glow ? 2.5 : 1.5"
          :stroke-opacity="link.glow ? 0.9 : 0.45" stroke-linecap="round"
          :stroke-dasharray="link.glow ? 'none' : '3 2'" />
        <circle :cx="link.x1" :cy="link.y1" r="3" :fill="link.color" :opacity="link.glow ? 0.9 : 0.5" />
        <circle :cx="link.x2" :cy="link.y2" r="3" :fill="link.color" :opacity="link.glow ? 0.9 : 0.5" />
      </g>
    </svg>

    <!-- 物品层 -->
    <div class="grid-items">
      <ItemCard
        v-for="item in items"
        :key="item.instanceId"
        :item="item"
        :grid-col="item.col"
        :grid-row="item.row"
        :cell-size="effectiveCellSize"
        :cell-height="effectiveCellHeight"
        :cell-gap="CELL_GAP"
        :is-enemy="isEnemy"
        :is-battle="isBattle"
        :compact="compact"
        :stack="item.stack || 1"
        :neighbor-highlight="!compact && neighborIds.has(item.instanceId)"
        @hover-enter="onItemHoverEnter"
        @hover-leave="onItemHoverLeave"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import ItemCard from './ItemCard.vue'
import { dragState } from '../composables/useDrag.js'

const props = defineProps({
  items:        { type: Array,   default: () => [] },
  isEnemy:      { type: Boolean, default: false },
  isBattle:     { type: Boolean, default: false },
  compact:      { type: Boolean, default: false },
  cellSize:     { type: Number,  default: 0 },      // 0 = auto（格子宽度）
  cellHeight:   { type: Number,  default: 0 },      // 0 = 与 cellSize 相同
  zone:         { type: String,  default: 'player' },
  rows:         { type: Number,  default: 2 },       // 背包默认2行，阵容传1
  unlockedCols: { type: Number,  default: 4 },       // 背包默认4列，阵容传当前解锁数
})

const CELL_DEFAULT = 90
const CELL_COMPACT = 72
const CELL_GAP     = 4

const effectiveCellSize = computed(() => {
  if (props.cellSize > 0) return props.cellSize
  return props.compact ? CELL_COMPACT : CELL_DEFAULT
})

const COLS = computed(() => props.unlockedCols)
const ROWS = computed(() => props.rows)

const effectiveCellHeight = computed(() =>
  props.cellHeight > 0 ? props.cellHeight : effectiveCellSize.value
)

const svgW = computed(() => effectiveCellSize.value * COLS.value + CELL_GAP * (COLS.value - 1))
const svgH = computed(() => effectiveCellHeight.value * ROWS.value + CELL_GAP * (ROWS.value - 1))

const containerStyle = computed(() => {
  const C = effectiveCellSize.value, G = CELL_GAP, H = effectiveCellHeight.value
  return {
    width:  (C * COLS.value + G * (COLS.value - 1)) + 'px',
    height: (H * ROWS.value + G * (ROWS.value - 1)) + 'px',
  }
})

// 只渲染当前解锁的格子
const slots = computed(() =>
  Array.from({ length: ROWS.value }, (_, r) =>
    Array.from({ length: COLS.value }, (_, c) => ({ row: r, col: c }))
  ).flat()
)

// 拖拽放置高亮（仅在目标区域与本组件 zone 匹配时显示）
const hoverCells = computed(() => {
  if (!dragState.active || props.isEnemy) return new Set()
  if (dragState.hoverCol < 0) return new Set()
  const myZone = props.zone === 'backpack' ? 'backpack' : 'formation'
  const targetZ = dragState.targetZone ?? 'formation'
  if (myZone !== targetZ) return new Set()
  return new Set([`${dragState.hoverRow}-${dragState.hoverCol}`])
})

function slotClass(row, col) {
  if (!dragState.active || props.isEnemy) return ''
  if (!hoverCells.value.has(`${row}-${col}`)) return ''
  return dragState.hoverValid ? 'valid' : 'invalid'
}

// ── 相邻连线（单行，只需检查左右相邻）──────────────────────
function itemColSpan(item) {
  return [item.col, item.col]
}
function hasSharedTag(a, b) {
  return a.tags?.some(t => b.tags?.includes(t)) ?? false
}

const adjacencyLinks = computed(() => {
  const links = [], C = effectiveCellSize.value, G = CELL_GAP
  const sorted = [...props.items]
    .map(it => ({ item: it, left: itemColSpan(it)[0], right: itemColSpan(it)[1] }))
    .sort((a, b) => a.left - b.left)
  const y = C / 2  // 单行，垂直居中
  for (let i = 0; i < sorted.length - 1; i++) {
    const A = sorted[i], B = sorted[i + 1]
    if (B.left !== A.right + 1) continue
    links.push({
      key: `${A.item.instanceId}-${B.item.instanceId}`,
      x1: (A.right + 1) * (C + G) - G - 2,
      y1: y,
      x2: B.left * (C + G) + 2,
      y2: y,
      color: hasSharedTag(A.item, B.item) ? '#c8860a' : '#4a6080',
      glow:  hasSharedTag(A.item, B.item),
    })
  }
  return links
})

// ── Hover 邻居高亮（单行左右相邻）──────────────────────────
const hoveredItem = ref(null)
const neighborIds = computed(() => {
  if (!hoveredItem.value) return new Set()
  const span = itemColSpan(hoveredItem.value)
  const ids = new Set()
  for (const other of props.items) {
    if (other.instanceId === hoveredItem.value.instanceId) continue
    const os = itemColSpan(other)
    if (os[0] === span[span.length - 1] + 1 || os[os.length - 1] === span[0] - 1) {
      ids.add(other.instanceId)
    }
  }
  return ids
})
function onItemHoverEnter(item) { hoveredItem.value = item }
function onItemHoverLeave()     { hoveredItem.value = null }

// 动态 grid 布局（列数/行数由 props 决定）
const slotsGridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${COLS.value}, 1fr)`,
  gridTemplateRows:    `repeat(${ROWS.value}, 1fr)`,
}))

// stack 现在直接存在 item.stack 上，GridBoard 无需额外计算
</script>

<style scoped>
.grid-container {
  position: relative; flex-shrink: 0; margin: 0 auto;
}
.grid-slots {
  position: absolute; inset: 0;
  display: grid;
  gap: 4px;
}
/* 普通槽位 */
.grid-slot {
  background: rgba(6,14,26,.50);
  border: 1px dashed rgba(60,120,180,.30);
  border-radius: 5px;
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  transition: background .12s, border-color .12s;
}
.grid-slot.valid   { background: rgba(39,174,96,.18); border: 2px solid #27ae60; }
.grid-slot.invalid { background: rgba(231,76,60,.14); border: 2px solid #e74c3c; }

/* 隐形 drop target（compact 模式下的拖拽锚点） */
.ghost-slots .grid-slot.ghost {
  background: transparent; border: none;
}
.ghost-slots .grid-slot.ghost.valid   { background: rgba(39,174,96,.1); border: 1px solid #27ae60; }
.ghost-slots .grid-slot.ghost.invalid { background: rgba(231,76,60,.08); border: 1px solid #e74c3c; }

.grid-items { position: absolute; inset: 0; pointer-events: none; }
</style>
