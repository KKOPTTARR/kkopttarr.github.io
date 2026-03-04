<template>
  <div
    class="arena-card"
    :class="{
      'is-attacking':  isAttacking,
      'is-triggering': item.triggering,
      'is-charging':   cooldownPct >= 88,
      'is-frozen':     item.frozenMs > 0,
    }"
    :style="cardStyle"
    :data-instance="item.instanceId"
  >
    <!-- 图标 -->
    <div class="card-icon-wrap">
      <img
        v-if="!imgErr"
        :src="iconUrl"
        :alt="item.name_cn"
        class="card-icon"
        draggable="false"
        @error="imgErr = true"
      />
      <span v-else class="card-icon-fallback">{{ fallbackEmoji }}</span>

      <!-- 受击覆盖层 -->
      <div class="hit-overlay" :class="{ active: item.triggering }"></div>
    </div>

    <!-- 冷却进度条 -->
    <div class="cd-track">
      <div class="cd-fill" :style="{ width: cooldownPct + '%', background: cdColor }"></div>
    </div>

    <!-- 关键数值 overlay -->
    <div v-if="mainStat" class="stat-overlay" :class="`stat-${statType}`">{{ mainStat }}</div>

    <!-- 状态徽章 -->
    <div v-if="hasStatus" class="status-badges">
      <span v-if="item.burnStacks   > 0" class="s-badge">🔥</span>
      <span v-if="item.poisonStacks > 0" class="s-badge">☠</span>
      <span v-if="item.frozenMs     > 0" class="s-badge">❄️</span>
    </div>

    <!-- 充能光环（>88%） -->
    <div v-if="cooldownPct >= 88" class="charge-ring"></div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { getIconUrl } from '../data/items.js'

const props = defineProps({
  item:        { type: Object,  required: true },
  cellSize:    { type: Number,  default: 54 },
  isAttacking: { type: Boolean, default: false },
})

const CELL_GAP = 4
const imgErr   = ref(false)
const iconUrl  = computed(() => getIconUrl(props.item.name_en, props.item.tier))

const fallbackEmoji = computed(() => {
  const t = props.item.tags?.[0] || ''
  if (t.includes('武器') || t.includes('枪械')) return '⚔️'
  if (t.includes('防具')) return '🛡'
  if (t.includes('伙伴')) return '🐟'
  if (t.includes('载具')) return '🚢'
  if (t.includes('工具')) return '🔧'
  if (t.includes('食物')) return '🍖'
  if (t.includes('科技')) return '⚙️'
  return '📦'
})

// 位置与尺寸（基于 col/row + cellSize）
const cardStyle = computed(() => {
  const C = props.cellSize, G = CELL_GAP
  const { col, row } = props.item
  return {
    left:   col * (C + G) + 'px',
    top:    row * (C + G) + 'px',
    width:  C + 'px',
    height: C + 'px',
  }
})

const cooldownPct = computed(() =>
  props.item.cooldown > 0
    ? Math.min(100, (props.item.cooldownProgress / props.item.cooldown) * 100)
    : 0
)

const cdColor = computed(() => {
  const p = cooldownPct.value
  if (p >= 88) return 'linear-gradient(90deg,#e67e22,#ffd700)'
  if (p >= 60) return 'linear-gradient(90deg,#2471a3,#f39c12)'
  return 'linear-gradient(90deg,#1a5276,#2e86c1)'
})

const statType = computed(() => {
  const i = props.item
  if (i.damage  > 0) return 'damage'
  if (i.heal    > 0) return 'heal'
  if (i.shield  > 0) return 'shield'
  if (i.burn    > 0) return 'burn'
  if (i.poison  > 0) return 'poison'
  return 'damage'
})

const mainStat = computed(() => {
  const i = props.item
  if (i.damage  > 0) return i.damage
  if (i.heal    > 0) return `+${i.heal}`
  if (i.shield  > 0) return i.shield
  if (i.burn    > 0) return i.burn
  if (i.poison  > 0) return i.poison
  return null
})

const hasStatus = computed(() =>
  (props.item.burnStacks   || 0) > 0 ||
  (props.item.poisonStacks || 0) > 0 ||
  (props.item.frozenMs     || 0) > 0
)
</script>

<style scoped>
/* ── 基础 ── */
.arena-card {
  position: absolute;
  border-radius: 6px; overflow: visible;
  border: 5px solid transparent;
  display: flex; flex-direction: column; align-items: stretch;
  background: #0a1828;
  cursor: default;
  transition: transform .1s, box-shadow .15s;
  will-change: transform;
}

/* 图标区 */
.card-icon-wrap {
  flex: 1; position: relative; overflow: hidden;
  background: #060f1e;
  display: flex; align-items: center; justify-content: center;
}
.card-icon { width: 100%; height: 100%; object-fit: cover; display: block; }
.card-icon-fallback { font-size: 20px; }

/* 受击覆盖层 */
.hit-overlay {
  position: absolute; inset: 0;
  background: rgba(255,255,255,.0);
  transition: background .05s;
}
.hit-overlay.active { background: rgba(255,255,255,.35); }

/* 冷却条 */
.cd-track { height: 3px; background: #060e1a; flex-shrink: 0; }
.cd-fill  { height: 100%; transition: width .06s linear, background .5s; }

/* 关键数值 */
.stat-overlay {
  position: absolute; top: 3px;
  left: 50%; transform: translateX(-50%);
  padding: 1px 5px; border-radius: 4px;
  font-size: 10px; font-weight: 900; color: #fff;
  text-shadow: 0 1px 2px rgba(0,0,0,.5);
  white-space: nowrap; pointer-events: none; z-index: 5; line-height: 1.3;
}
.stat-overlay.stat-damage { background: rgba(200,30,30,.9); }
.stat-overlay.stat-burn   { background: rgba(200,30,30,.9); }
.stat-overlay.stat-poison { background: rgba(20,100,30,.9); }
.stat-overlay.stat-heal   { background: rgba(40,170,60,.9); }
.stat-overlay.stat-shield { background: rgba(180,140,0,.9); }

/* 状态徽章 */
.status-badges {
  position: absolute; top: -4px; right: -4px;
  display: flex; flex-direction: column; gap: 1px; z-index: 10; pointer-events: none;
}
.s-badge { font-size: 9px; line-height: 1.1; }

/* ── 充能光环 ── */
.charge-ring {
  position: absolute; inset: -3px; border-radius: 8px; pointer-events: none;
  border: 2px solid rgba(255,165,0,.7);
  box-shadow: 0 0 10px rgba(255,165,0,.5), inset 0 0 6px rgba(255,165,0,.15);
  animation: charge-pulse .5s ease-in-out infinite;
}
@keyframes charge-pulse {
  0%, 100% { opacity: .7; transform: scale(1); }
  50%       { opacity: 1;  transform: scale(1.04); }
}

/* ── 攻击状态（当前正在攻击的物品） ── */
@keyframes attacking-glow {
  0%   { box-shadow: 0 0 0 rgba(255,255,255,0); }
  40%  { box-shadow: 0 0 20px 6px rgba(255,255,255,.7), 0 0 8px 3px rgba(255,215,0,.5);
         transform: scale(1.12); }
  70%  { transform: scale(1.05); }
  100% { box-shadow: inherit; transform: scale(1); }
}
.arena-card.is-attacking {
  animation: attacking-glow .5s ease-out;
  z-index: 20 !important;
}

/* ── 触发动画（item.triggering） ── */
@keyframes trigger-flash {
  0%   { box-shadow: 0 0 0 rgba(255,255,255,0); }
  30%  { box-shadow: 0 0 16px 5px rgba(255,255,255,.6); transform: scale(1.08); }
  100% { box-shadow: inherit; transform: scale(1); }
}
.arena-card.is-triggering {
  animation: trigger-flash .45s ease-out;
  z-index: 15 !important;
}

/* ── 冰冻 ── */
.arena-card.is-frozen { filter: hue-rotate(180deg) brightness(1.15); }
</style>
