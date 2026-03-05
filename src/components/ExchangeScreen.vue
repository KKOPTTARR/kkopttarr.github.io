<template>
  <div class="exchange-screen">
    <PanelStatus :lives="lives" :max-lives="maxLives" :battle-count="battleCount" />

    <!-- 标题栏 -->
    <div class="screen-header">
      <span class="screen-title">🔀 以物换物</span>
      <button class="skip-btn" @click="$emit('skip')">跳过</button>
    </div>

    <!-- 目标槽 -->
    <div class="drop-area">
      <div
        ref="dropZoneRef"
        class="drop-zone"
        :class="{ 'over': overDrop, 'filled': slotItem }"
      >
        <template v-if="slotItem">
          <img :src="getIconUrl(slotItem.name_en, slotItem.tier)" class="slot-img" draggable="false" />
          <div class="slot-name" :class="`name-${slotItem.tier.toLowerCase()}`">{{ slotItem.name_cn }}</div>
          <div class="slot-hint">松手确认 · 再次拖拽可替换</div>
        </template>
        <template v-else>
          <div class="drop-icon">{{ overDrop ? '✓' : '↑' }}</div>
          <div class="drop-label">拖入要送出的「{{ fromType }}」</div>
          <div class="drop-sublabel">将换取随机同品质「{{ toType }}」</div>
        </template>
      </div>
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
      <div class="area-label">— 我的「{{ fromType }}」 —</div>
      <div class="items-grid">
        <div
          v-for="item in items"
          :key="item.instanceId"
          class="item-tile"
          :class="[`tier-border-${item.tier.toLowerCase()}`, { dragging: dragging?.instanceId === item.instanceId }]"
          @pointerdown.prevent="onPointerDown($event, item)"
        >
          <img :src="getIconUrl(item.name_en, item.tier)" class="tile-img" draggable="false" />
          <div class="tile-name">{{ item.name_cn }}</div>
          <div class="tile-tier" :class="`name-${item.tier.toLowerCase()}`">{{ TIER_LABELS[item.tier] }}</div>
        </div>
      </div>
      <div v-if="items.length === 0" class="empty-hint">暂无可交换的物品</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { getIconUrl } from '../data/items.js'
import { TIER_LABELS } from '../data/tiers.js'
import PanelStatus from './PanelStatus.vue'

defineProps({
  items:       { type: Array,  default: () => [] },
  fromType:    { type: String, default: '' },
  toType:      { type: String, default: '' },
  lives:       Number,
  maxLives:    Number,
  battleCount: Number,
})

const emit = defineEmits(['confirm', 'skip'])

const dragging   = ref(null)
const ghostX     = ref(0)
const ghostY     = ref(0)
const overDrop   = ref(false)
const slotItem   = ref(null)
const dropZoneRef = ref(null)

function onPointerDown(e, item) {
  dragging.value = item
  ghostX.value = e.clientX - 28
  ghostY.value = e.clientY - 28
}

function onPointerMove(e) {
  if (!dragging.value) return
  ghostX.value = e.clientX - 28
  ghostY.value = e.clientY - 28
  if (dropZoneRef.value) {
    const r = dropZoneRef.value.getBoundingClientRect()
    overDrop.value = e.clientX >= r.left && e.clientX <= r.right
                  && e.clientY >= r.top  && e.clientY <= r.bottom
  }
}

function onPointerUp() {
  if (!dragging.value) return
  if (overDrop.value) {
    // 放入槽位，短暂展示后 emit
    slotItem.value = dragging.value
    setTimeout(() => {
      emit('confirm', slotItem.value)
    }, 500)
  }
  dragging.value = null
  overDrop.value = false
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
.exchange-screen {
  position: fixed; top: 0; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 600px; z-index: 200;
  display: flex; flex-direction: column;
  background:
    linear-gradient(rgba(4,10,4,.72), rgba(4,10,4,.72)),
    url('/background/bg-sea-chart.png') center / cover no-repeat;
}

.screen-header {
  flex-shrink: 0; display: flex; justify-content: space-between; align-items: center;
  padding: 14px 14px 10px;
  border-bottom: 1px solid var(--panel-border);
}
.screen-title { font-size: 16px; font-weight: bold; color: var(--gold); }
.skip-btn {
  padding: 6px 14px; border-radius: 6px; font-size: 12px;
  background: var(--panel); border: 1px solid var(--panel-border);
  color: var(--text-dim); cursor: pointer; font-family: inherit;
}
.skip-btn:hover { border-color: var(--gold); color: var(--gold); }

/* ── 目标槽区 ── */
.drop-area {
  flex-shrink: 0;
  padding: 20px 20px 10px;
  display: flex; justify-content: center;
}
.drop-zone {
  width: 100%; max-width: 340px;
  min-height: 110px;
  border-radius: 14px;
  border: 2px dashed rgba(200,134,10,.35);
  background: rgba(200,134,10,.04);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 6px;
  transition: border-color .15s, background .15s, box-shadow .15s;
}
.drop-zone.over {
  border-color: #c8860a;
  background: rgba(200,134,10,.12);
  box-shadow: 0 0 20px rgba(200,134,10,.2);
}
.drop-zone.filled {
  border-style: solid;
  border-color: rgba(200,134,10,.6);
  background: rgba(200,134,10,.08);
}

.drop-icon {
  font-size: 32px; color: rgba(200,134,10,.4);
  transition: color .15s;
}
.drop-zone.over .drop-icon { color: #c8860a; }
.drop-label { font-size: 14px; color: rgba(200,134,10,.7); font-weight: bold; }
.drop-sublabel { font-size: 11px; color: var(--text-dim); }

.slot-img { width: 64px; height: 64px; border-radius: 10px; object-fit: cover; }
.slot-name { font-size: 13px; font-weight: bold; }
.slot-hint { font-size: 10px; color: var(--text-dim); }

/* ── 物品列表 ── */
.items-area {
  flex: 1; overflow-y: auto;
  padding: 10px 16px 16px;
  display: flex; flex-direction: column; gap: 12px;
}
.area-label {
  font-size: 11px; color: var(--gold);
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
  touch-action: none;
  user-select: none;
}
.item-tile:hover { background: rgba(255,255,255,.08); }
.item-tile.dragging { opacity: .35; }

.tile-img { width: 52px; height: 52px; border-radius: 8px; object-fit: cover; pointer-events: none; }
.tile-name { font-size: 10px; color: var(--text); text-align: center; line-height: 1.3; }
.tile-tier { font-size: 10px; font-weight: bold; }

/* 品质边框 */
.tier-border-bronze  { border-color: rgba(180,110,20,.35); }
.tier-border-silver  { border-color: rgba(160,160,200,.30); }
.tier-border-gold    { border-color: rgba(212,168,32,.40); }
.tier-border-diamond { border-color: rgba(60,180,255,.35); }

.tier-border-bronze:hover  { border-color: var(--bronze); }
.tier-border-silver:hover  { border-color: var(--silver); }
.tier-border-gold:hover    { border-color: var(--gold);   }
.tier-border-diamond:hover { border-color: var(--gem);    }

/* 品质文字 */
.name-bronze  { color: var(--bronze); }
.name-silver  { color: var(--silver); }
.name-gold    { color: var(--gold);   }
.name-diamond { color: var(--gem);    }

/* ── 拖拽幽灵 ── */
.drag-ghost-local {
  position: fixed; z-index: 9999;
  width: 56px; height: 56px;
  border-radius: 10px; overflow: hidden;
  pointer-events: none;
  opacity: .85;
  box-shadow: 0 6px 20px rgba(0,0,0,.5);
  transform: rotate(4deg) scale(1.05);
}
.drag-ghost-local img {
  width: 100%; height: 100%; object-fit: cover;
}

.empty-hint { color: var(--text-dim); font-size: 13px; text-align: center; padding: 24px 0; opacity: .6; }
</style>
