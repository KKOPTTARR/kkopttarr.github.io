<template>
  <div class="alchemy-screen">
    <PanelStatus :lives="lives" :max-lives="maxLives" :battle-count="battleCount" />

    <!-- 标题栏 -->
    <div class="screen-header">
      <span class="screen-title">⚗️ 炼金</span>
      <button class="skip-btn" @click="$emit('skip')">跳过</button>
    </div>

    <!-- 熔炉区 -->
    <div class="cauldron-area">
      <div class="cauldron-desc">
        <template v-if="!lockedTier">选择 3 件同品质物品拖入熔炉，炼制更高品质宝物</template>
        <template v-else>炼化 3 件{{ TIER_LABELS[lockedTier] }}质物品 → 获得 1 件{{ OUTPUT_LABEL[lockedTier] }}宝物</template>
        <span class="slot-count" :class="{ full: slots.filter(s=>s).length === 3 }">
          {{ slots.filter(s=>s).length }}/3
        </span>
      </div>
      <div class="cauldron-slots">
        <div
          v-for="i in 3"
          :key="i"
          :ref="el => { slotRefs[i-1] = el }"
          class="cauldron-slot"
          :class="{
            'over': overSlotIdx === i-1,
            'filled': slots[i-1],
            [`slot-${slots[i-1]?.tier?.toLowerCase()}`]: !!slots[i-1],
          }"
          @click="removeFromSlot(i-1)"
        >
          <template v-if="slots[i-1]">
            <img :src="getIconUrl(slots[i-1].name_en, slots[i-1].tier)" class="slot-img" draggable="false" />
            <div class="slot-name" :class="`name-${slots[i-1].tier.toLowerCase()}`">{{ slots[i-1].name_cn }}</div>
            <div class="slot-remove">×</div>
          </template>
          <template v-else>
            <div class="slot-empty-icon">{{ overSlotIdx === i-1 ? '✓' : '?' }}</div>
          </template>
        </div>
      </div>

      <button
        class="confirm-btn"
        :disabled="slots.filter(s=>s).length < 3"
        @click="onConfirm"
      >
        {{ confirmText }}
      </button>
    </div>

    <!-- 拖拽幽灵 -->
    <Teleport to="body">
      <div
        v-if="dragging"
        class="drag-ghost-local"
        :style="{ left: ghostX + 'px', top: ghostY + 'px' }"
      >
        <img :src="getIconUrl(dragging.name_en, dragging.tier)" draggable="false" />
      </div>
    </Teleport>

    <!-- 物品列表 -->
    <div class="items-area">
      <div class="area-label">— 我的物品 —</div>
      <div class="items-grid">
        <div
          v-for="item in items"
          :key="item.instanceId"
          class="item-tile"
          :class="[
            `tier-border-${item.tier.toLowerCase()}`,
            {
              dragging:  dragging?.instanceId === item.instanceId,
              disabled:  isDisabled(item),
              'in-slot': isInSlot(item),
            }
          ]"
          @pointerdown.prevent="onPointerDown($event, item)"
        >
          <img :src="getIconUrl(item.name_en, item.tier)" class="tile-img" draggable="false" />
          <div class="tile-name">{{ item.name_cn }}</div>
          <div class="tile-tier" :class="`name-${item.tier.toLowerCase()}`">{{ TIER_LABELS[item.tier] }}</div>
        </div>
      </div>
      <div v-if="items.length === 0" class="empty-hint">没有足够的可炼化物品</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getIconUrl } from '../data/items.js'
import { TIER_LABELS } from '../data/tiers.js'
import PanelStatus from './PanelStatus.vue'

defineProps({
  items:       { type: Array,  default: () => [] },
  lives:       Number,
  maxLives:    Number,
  battleCount: Number,
})

const emit = defineEmits(['confirm', 'skip'])

const OUTPUT_LABEL = { Bronze: '银质', Silver: '金质', Gold: '钻石' }

// 熔炉槽（3个位置）
const slots    = ref([null, null, null])
const slotRefs = [null, null, null]

// 拖拽状态
const dragging    = ref(null)
const ghostX      = ref(0)
const ghostY      = ref(0)
const overSlotIdx = ref(-1)

const lockedTier = computed(() => slots.value.find(s => s)?.tier ?? null)

const confirmText = computed(() => {
  const n = slots.value.filter(s => s).length
  if (n < 3) return `还需放入 ${3 - n} 件`
  return `⚗️ 炼制${OUTPUT_LABEL[lockedTier.value] ?? '更高品质'}宝物`
})

function isInSlot(item) {
  return slots.value.some(s => s?.instanceId === item.instanceId)
}

function isDisabled(item) {
  return lockedTier.value !== null
    && item.tier !== lockedTier.value
    && !isInSlot(item)
}

function removeFromSlot(i) {
  slots.value[i] = null
}

function getHitSlotIdx(x, y) {
  for (let i = 0; i < slotRefs.length; i++) {
    const el = slotRefs[i]
    if (!el) continue
    const r = el.getBoundingClientRect()
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return i
  }
  return -1
}

function onPointerDown(e, item) {
  if (isDisabled(item) || isInSlot(item)) return
  dragging.value = item
  ghostX.value = e.clientX - 28
  ghostY.value = e.clientY - 28
}

function onPointerMove(e) {
  if (!dragging.value) return
  ghostX.value = e.clientX - 28
  ghostY.value = e.clientY - 28
  overSlotIdx.value = getHitSlotIdx(e.clientX, e.clientY)
}

function onPointerUp(e) {
  if (!dragging.value) return
  const hitIdx = getHitSlotIdx(e.clientX, e.clientY)
  if (hitIdx !== -1 && !slots.value[hitIdx]) {
    slots.value[hitIdx] = dragging.value
  }
  dragging.value    = null
  overSlotIdx.value = -1
}

function onConfirm() {
  const filled = slots.value.filter(s => s)
  if (filled.length < 3) return
  emit('confirm', filled)
}

onMounted(() => {
  window.addEventListener('pointermove', onPointerMove, { passive: false })
  window.addEventListener('pointerup',   onPointerUp)
})
onUnmounted(() => {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup',   onPointerUp)
})
</script>

<style scoped>
.alchemy-screen {
  position: fixed; top: 0; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 600px; z-index: 200;
  display: flex; flex-direction: column;
  background:
    linear-gradient(rgba(8,4,16,.74), rgba(8,4,16,.74)),
    url('/background/bg-sea-chart.png') center / cover no-repeat;
}

.screen-header {
  flex-shrink: 0; display: flex; justify-content: space-between; align-items: center;
  padding: 14px 14px 10px;
  border-bottom: 1px solid var(--panel-border);
}
.screen-title { font-size: 16px; font-weight: bold; color: #c080ff; }
.skip-btn {
  padding: 6px 14px; border-radius: 6px; font-size: 12px;
  background: var(--panel); border: 1px solid var(--panel-border);
  color: var(--text-dim); cursor: pointer; font-family: inherit;
}
.skip-btn:hover { border-color: #c080ff; color: #c080ff; }

/* ── 熔炉区 ── */
.cauldron-area {
  flex-shrink: 0;
  padding: 16px 16px 12px;
  border-bottom: 1px solid var(--panel-border);
  display: flex; flex-direction: column; align-items: center; gap: 12px;
}
.cauldron-desc {
  font-size: 12px; color: var(--text-dim);
  display: flex; align-items: center; gap: 10px;
}
.slot-count {
  font-weight: bold; color: var(--text-dim);
  transition: color .14s;
}
.slot-count.full { color: #c080ff; }

.cauldron-slots {
  display: flex; gap: 12px;
}
.cauldron-slot {
  width: 90px; min-height: 110px;
  border-radius: 12px;
  border: 2px dashed rgba(160,60,255,.3);
  background: rgba(160,60,255,.04);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 6px; padding: 8px 6px;
  transition: border-color .14s, background .14s, box-shadow .14s;
  cursor: default;
  position: relative;
}
.cauldron-slot.over {
  border-color: #c080ff;
  background: rgba(160,60,255,.12);
  box-shadow: 0 0 14px rgba(160,60,255,.25);
}
.cauldron-slot.filled {
  border-style: solid;
  cursor: pointer;
}
.slot-bronze  { border-color: rgba(180,110,20,.6); background: rgba(180,110,20,.08); }
.slot-silver  { border-color: rgba(160,160,200,.5); background: rgba(160,160,200,.06); }
.slot-gold    { border-color: rgba(212,168,32,.6); background: rgba(212,168,32,.08); }
.slot-diamond { border-color: rgba(60,180,255,.5); background: rgba(60,180,255,.06); }

.slot-empty-icon {
  font-size: 28px; color: rgba(160,60,255,.2);
  font-weight: 900;
}
.slot-img { width: 52px; height: 52px; border-radius: 8px; object-fit: cover; }
.slot-name { font-size: 10px; font-weight: bold; text-align: center; }
.slot-remove {
  position: absolute; top: 4px; right: 6px;
  font-size: 14px; color: rgba(255,255,255,.25);
  line-height: 1;
}
.cauldron-slot.filled:hover .slot-remove { color: rgba(255,80,80,.7); }

.confirm-btn {
  padding: 10px 28px; border-radius: 8px;
  font-size: 13px; font-weight: bold; font-family: inherit;
  cursor: pointer;
  background: linear-gradient(135deg, #5a1a8a, #9030d0);
  color: #e8d0ff; border: 1px solid #a040e0;
  box-shadow: 0 2px 8px rgba(120,40,200,.3);
  transition: filter .12s, box-shadow .12s;
}
.confirm-btn:hover:not(:disabled) { filter: brightness(1.12); box-shadow: 0 4px 16px rgba(160,60,255,.4); }
.confirm-btn:disabled { opacity: .4; cursor: not-allowed; filter: none; box-shadow: none; }

/* ── 物品列表 ── */
.items-area {
  flex: 1; overflow-y: auto;
  padding: 10px 16px 16px;
  display: flex; flex-direction: column; gap: 12px;
}
.area-label {
  font-size: 11px; color: #c080ff;
  letter-spacing: 2px; text-align: center;
}
.items-grid {
  display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;
}

.item-tile {
  width: 80px;
  display: flex; flex-direction: column; align-items: center;
  gap: 4px; padding: 8px 6px;
  border-radius: 10px; cursor: grab;
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.10);
  transition: border-color .14s, background .14s, opacity .14s;
  touch-action: none; user-select: none;
}
.item-tile:hover:not(.disabled):not(.in-slot) { background: rgba(160,60,255,.08); }
.item-tile.dragging { opacity: .3; }
.item-tile.disabled { opacity: .25; cursor: not-allowed; }
.item-tile.in-slot  { opacity: .4;  cursor: default; }

.tile-img { width: 52px; height: 52px; border-radius: 8px; object-fit: cover; pointer-events: none; }
.tile-name { font-size: 10px; color: var(--text); text-align: center; line-height: 1.3; }
.tile-tier { font-size: 10px; font-weight: bold; }

.tier-border-bronze  { border-color: rgba(180,110,20,.35); }
.tier-border-silver  { border-color: rgba(160,160,200,.30); }
.tier-border-gold    { border-color: rgba(212,168,32,.40); }
.tier-border-diamond { border-color: rgba(60,180,255,.35); }

.name-bronze  { color: var(--bronze); }
.name-silver  { color: var(--silver); }
.name-gold    { color: var(--gold);   }
.name-diamond { color: var(--gem);    }

/* ── 拖拽幽灵 ── */
.drag-ghost-local {
  position: fixed; z-index: 9999;
  width: 56px; height: 56px;
  border-radius: 10px; overflow: hidden;
  pointer-events: none; opacity: .85;
  box-shadow: 0 6px 20px rgba(0,0,0,.5);
  transform: rotate(4deg) scale(1.05);
}
.drag-ghost-local img { width: 100%; height: 100%; object-fit: cover; }

.empty-hint { color: var(--text-dim); font-size: 13px; text-align: center; padding: 24px 0; opacity: .6; }
</style>
