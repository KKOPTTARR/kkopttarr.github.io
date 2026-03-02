<template>
  <div
    class="arena-card"
    :class="{ triggering: item.triggering }"
    :style="gridStyle"
    :data-instance="item.instanceId"
  >
    <!-- 全出血图片 -->
    <img :src="iconUrl" :alt="item.name_cn" class="card-img" draggable="false" />

    <!-- 顶部：品级点 + 状态 badges -->
    <div class="card-top">
      <span class="tier-dot" :style="tierDotStyle"></span>
      <div class="status-badges">
        <span v-if="item.burnStacks   > 0" class="badge burn-badge">🔥{{ item.burnStacks }}</span>
        <span v-if="item.poisonStacks > 0" class="badge poison-badge">☠{{ item.poisonStacks }}</span>
      </div>
    </div>

    <!-- 底部渐变叠层：名称 + CD 条 -->
    <div class="card-bottom">
      <div class="card-name">{{ item.name_cn }}</div>
      <div class="cd-row">
        <div class="cd-track">
          <div class="cd-fill" :style="cdFillStyle"></div>
        </div>
        <span class="cd-stat" :class="`stat-${statType}`">{{ mainStat }}</span>
      </div>
    </div>

    <!-- 触发时的光晕 -->
    <div v-if="item.triggering" class="trigger-glow"></div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getIconUrl } from '../data/items.js'

const props = defineProps({
  item: { type: Object, required: true },
})

const iconUrl = computed(() => getIconUrl(props.item.name_en))

// CSS Grid 放置（2行×4列）
const gridStyle = computed(() => ({
  gridColumn: `${props.item.col + 1} / span 1`,
  gridRow:    `${(props.item.row ?? 0) + 1} / span 1`,
}))

// 品级色
const TIER_COLORS = { Bronze: '#cd7f32', Silver: '#c0c0c0', Gold: '#ffd700', Diamond: '#b9f2ff' }
const tierDotStyle = computed(() => ({
  background: TIER_COLORS[props.item.tier] || '#888'
}))

// 冷却条
const cdPct = computed(() => {
  const { cooldownProgress = 0, cooldown = 1 } = props.item
  return Math.min(100, (cooldownProgress / cooldown) * 100)
})

const cdFillStyle = computed(() => {
  const p = cdPct.value
  let bg = '#2471a3'
  if (p >= 88) bg = 'linear-gradient(90deg,#c0350a,#f39c12,#ffd700)'
  else if (p >= 55) bg = 'linear-gradient(90deg,#2471a3,#c0350a)'
  return { width: p + '%', background: bg }
})

// 主要数值
const statType = computed(() => {
  const i = props.item
  if (i.damage  > 0) return 'damage'
  if (i.heal    > 0) return 'heal'
  if (i.shield  > 0) return 'shield'
  if (i.burn    > 0) return 'burn'
  if (i.poison  > 0) return 'poison'
  return 'none'
})

const mainStat = computed(() => {
  const i = props.item
  if (i.damage  > 0) return `⚔️${i.damage}`
  if (i.heal    > 0) return `💚${i.heal}`
  if (i.shield  > 0) return `🛡${i.shield}`
  if (i.burn    > 0) return `🔥${i.burn}`
  if (i.poison  > 0) return `☠${i.poison}`
  return ''
})
</script>

<style scoped>
.arena-card {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,.1);
  transition: border-color .15s;
  cursor: default;
  background: #0a0804;
  aspect-ratio: 3 / 4;
}
.arena-card.triggering {
  border-color: rgba(255,200,50,.6);
  animation: card-trigger .4s ease-out;
}
@keyframes card-trigger {
  0%   { box-shadow: 0 0 0 rgba(255,200,50,0); }
  30%  { box-shadow: 0 0 14px rgba(255,200,50,.7); }
  100% { box-shadow: 0 0 0 rgba(255,200,50,0); }
}

/* 全出血图片 */
.card-img {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  object-fit: cover; object-position: center;
  display: block;
}

/* 顶部：品级点 + 状态 */
.card-top {
  position: absolute; top: 4px; left: 4px; right: 4px;
  display: flex; justify-content: space-between; align-items: flex-start;
  z-index: 2;
}
.tier-dot {
  width: 7px; height: 7px; border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 4px currentColor;
}
.status-badges { display: flex; gap: 2px; flex-wrap: wrap; }
.badge {
  font-size: 9px; padding: 1px 4px; border-radius: 6px;
  background: rgba(0,0,0,.7); backdrop-filter: blur(2px);
}
.burn-badge   { color: var(--burn); }
.poison-badge { color: var(--poison); }

/* 底部渐变叠层 */
.card-bottom {
  position: absolute; bottom: 0; left: 0; right: 0;
  padding: 14px 5px 5px;
  background: linear-gradient(to bottom, transparent 0%, rgba(0,0,0,.82) 100%);
  z-index: 2;
}
.card-name {
  font-size: 9px; font-weight: bold; color: rgba(255,255,255,.9);
  margin-bottom: 3px; white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis;
}
.cd-row {
  display: flex; align-items: center; gap: 4px;
}
.cd-track {
  flex: 1; height: 4px; border-radius: 2px;
  background: rgba(255,255,255,.1); overflow: hidden;
}
.cd-fill {
  height: 100%; border-radius: 2px;
  transition: width .12s linear;
}
.cd-stat {
  font-size: 9px; font-weight: bold; white-space: nowrap; flex-shrink: 0;
}
.stat-damage { color: #ff8060; }
.stat-heal   { color: #5ad070; }
.stat-shield { color: #70c8f0; }
.stat-burn   { color: var(--burn); }
.stat-poison { color: var(--poison); }

/* 触发光晕 */
.trigger-glow {
  position: absolute; inset: 0;
  background: radial-gradient(ellipse at center, rgba(255,200,50,.2) 0%, transparent 70%);
  pointer-events: none; z-index: 3;
  animation: glow-pulse .4s ease-out forwards;
}
@keyframes glow-pulse {
  0%   { opacity: 1; }
  100% { opacity: 0; }
}
</style>
