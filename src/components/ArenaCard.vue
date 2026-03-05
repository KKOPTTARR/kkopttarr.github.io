<template>
  <div
    class="arena-card"
    :class="[{ triggering: item.triggering, 'battle-active': item.battleActive }, item.triggering ? `glow-${statType}` : '']"
    :style="gridStyle"
    :data-instance="item.instanceId"
    @click="onCardClick"
  >
    <!-- 全出血图片 -->
    <img :src="iconUrl" :alt="item.name_cn" class="card-img" draggable="false" />

    <!-- 顶部：品级徽章（左） + 状态 badges（右） -->
    <div class="card-top">
      <span :class="`tier-badge tier-badge-${item.tier}`">{{ TIER_LABELS[item.tier] }}</span>
      <div class="status-badges">
        <span v-if="item.burnStacks   > 0" class="badge burn-badge">🔥{{ item.burnStacks }}</span>
        <span v-if="item.poisonStacks > 0" class="badge poison-badge">☠{{ item.poisonStacks }}</span>
      </div>
    </div>

    <!-- 主数值 pill（顶部居中，与品级行同高） -->
    <div v-if="mainStat" class="card-stat" :class="[`stat-${statType}`, { 'stat-growth-flash': growthFlash }]">{{ mainStat }}</div>

    <!-- 中央：倒计时数字 -->
    <div class="cd-center" :class="{ charging: isCharging }">{{ cdCountdown }}</div>

    <!-- 底部渐变叠层：名称 -->
    <div class="card-bottom">
      <div class="card-name">{{ item.name_cn }}</div>
    </div>

  </div>
</template>

<script setup>
import { computed, watch, ref } from 'vue'
import { getIconUrl } from '../data/items.js'
import { showBubble } from '../composables/useBubble.js'

const props = defineProps({
  item: { type: Object, required: true },
})

const iconUrl = computed(() => getIconUrl(props.item.name_en, props.item.tier))

// CSS Grid 放置
const gridStyle = computed(() => ({
  gridColumn: `${props.item.col + 1} / span 1`,
  gridRow:    `${(props.item.row ?? 0) + 1} / span 1`,
}))

const TIER_LABELS = { Bronze: '铜', Silver: '银', Gold: '金', Diamond: '钻' }

// 倒计时（0.1s 精度，向上取整避免提前显示 0）
const cdCountdown = computed(() => {
  const cd = props.item._cooldown ?? props.item.cooldown ?? 1000
  const remaining = Math.max(0, cd - (props.item.cooldownProgress ?? 0))
  const tenths = Math.ceil(remaining / 100) / 10
  const s = Number.isInteger(tenths) ? tenths : tenths.toFixed(1)
  return s + 's'
})

// 剩余 ≤ 1s 时进入"即将触发"状态
const isCharging = computed(() => {
  const cd = props.item._cooldown ?? props.item.cooldown ?? 1000
  return (cd - (props.item.cooldownProgress ?? 0)) <= 1000
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

// 战斗内累积 bonus（_bonusXxx 由 useBattle.js 在触发时写入）
const bonus = computed(() => {
  const i = props.item
  if (i.damage > 0) return i._bonusDamage || 0
  if (i.heal   > 0) return i._bonusHeal   || 0
  if (i.shield > 0) return i._bonusShield || 0
  if (i.burn   > 0) return i._bonusBurn   || 0
  if (i.poison > 0) return i._bonusPoison || 0
  return 0
})

// 主数值显示实际有效值（base + bonus）
const mainStat = computed(() => {
  const i = props.item
  const b = bonus.value
  if (i.damage  > 0) return i.damage + b
  if (i.heal    > 0) return `+${i.heal + b}`
  if (i.shield  > 0) return i.shield + b
  if (i.burn    > 0) return i.burn   + b
  if (i.poison  > 0) return i.poison + b
  return ''
})

// 数值增长时触发脉冲动画
const growthFlash = ref(false)
watch(bonus, (newVal, oldVal) => {
  if (newVal > oldVal) {
    growthFlash.value = true
    setTimeout(() => { growthFlash.value = false }, 500)
  }
})

function onCardClick(e) {
  e.stopPropagation()
  const elTop = e.currentTarget.getBoundingClientRect().top
  showBubble(props.item, e.clientX, elTop)
}
</script>

<style scoped>
.arena-card {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,.1);
  transition: border-color .15s;
  cursor: pointer;
  background: #0a0804;
  aspect-ratio: 3 / 4;
}
.arena-card.triggering {
  animation: card-trigger-pulse .50s ease-out;
  z-index: 10;
}
@keyframes card-trigger-pulse {
  0%   { transform: scale(1);    filter: brightness(1); }
  22%  { transform: scale(1.22); filter: brightness(1.8); }
  58%  { transform: scale(0.96); filter: brightness(1.1); }
  100% { transform: scale(1);    filter: brightness(1); }
}

/* 类型化发光边框 */
.triggering.glow-damage {
  box-shadow: 0 0 0 3px #ff5030, 0 0 22px 8px rgba(255,80,48,.85), 0 0 48px rgba(255,80,48,.45);
  border-color: #ff5030;
}
.triggering.glow-heal {
  box-shadow: 0 0 0 3px #40dd70, 0 0 22px 8px rgba(64,221,112,.85), 0 0 48px rgba(64,221,112,.45);
  border-color: #40dd70;
}
.triggering.glow-shield {
  box-shadow: 0 0 0 3px #60b8ff, 0 0 22px 8px rgba(96,184,255,.85), 0 0 48px rgba(96,184,255,.45);
  border-color: #60b8ff;
}
.triggering.glow-burn {
  box-shadow: 0 0 0 3px #ff8820, 0 0 22px 8px rgba(255,136,32,.85), 0 0 48px rgba(255,136,32,.45);
  border-color: #ff8820;
}
.triggering.glow-poison {
  box-shadow: 0 0 0 3px #80cc20, 0 0 22px 8px rgba(128,204,32,.85), 0 0 48px rgba(128,204,32,.45);
  border-color: #80cc20;
}
.triggering.glow-crit {
  box-shadow: 0 0 0 3px #ffd060, 0 0 22px 8px rgba(255,208,96,.85), 0 0 48px rgba(255,208,96,.45);
  border-color: #ffd060;
}

.arena-card.card-special {
  z-index: 20;
  animation:
    card-special-enter  0.20s ease-out,
    card-special-active 0.50s 0.20s ease-in-out infinite;
}
@keyframes card-special-enter {
  from { transform: scale(1);    box-shadow: none; }
  to   { transform: scale(1.22); box-shadow: 0 0 32px 12px rgba(255,215,50,1); }
}
@keyframes card-special-active {
  0%   { transform: scale(1.18) translateX( 0px); box-shadow: 0 0 26px  9px rgba(255,200,40,.88); }
  18%  { transform: scale(1.25) translateX(-6px); box-shadow: 0 0 40px 16px rgba(255,230,70,1.0); }
  36%  { transform: scale(1.21) translateX( 6px); box-shadow: 0 0 32px 12px rgba(255,205,45,.92); }
  54%  { transform: scale(1.25) translateX(-5px); box-shadow: 0 0 40px 16px rgba(255,230,70,1.0); }
  72%  { transform: scale(1.21) translateX( 5px); box-shadow: 0 0 32px 12px rgba(255,205,45,.92); }
  100% { transform: scale(1.18) translateX( 0px); box-shadow: 0 0 26px  9px rgba(255,200,40,.88); }
}

/* 全出血图片 */
.card-img {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  object-fit: contain; object-position: center;
  display: block;
}

/* 顶部：品级徽章 + 状态 */
.card-top {
  position: absolute; top: 4px; left: 4px; right: 4px;
  display: flex; justify-content: space-between; align-items: flex-start;
  z-index: 2;
}
.tier-badge {
  font-size: 9px; font-weight: 900; padding: 1px 4px; border-radius: 4px;
  backdrop-filter: blur(3px); border: 1px solid transparent;
  text-shadow: 0 1px 2px rgba(0,0,0,.8); flex-shrink: 0;
}
.tier-badge-Bronze  { background: rgba(160,70,0,.75);  color: #ffb060; border-color: rgba(255,110,10,.4); }
.tier-badge-Silver  { background: rgba(50,70,90,.75);  color: #d8e8f4; border-color: rgba(180,210,240,.35); }
.tier-badge-Gold    { background: rgba(110,70,0,.75);  color: #ffd700; border-color: rgba(255,200,0,.45); }
.tier-badge-Diamond { background: rgba(0,30,70,.75);   color: #80e8ff; border-color: rgba(0,180,255,.45); }
.status-badges { display: flex; gap: 2px; flex-wrap: wrap; }
.badge {
  font-size: 9px; padding: 1px 4px; border-radius: 6px;
  background: rgba(0,0,0,.7); backdrop-filter: blur(2px);
}
.burn-badge   { color: var(--burn); }
.poison-badge { color: var(--poison); }

/* 中央倒计时 */
.cd-center {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  z-index: 2;
  font-size: 18px; font-weight: 900; line-height: 1;
  color: rgba(255,255,255,.75);
  text-shadow: 0 1px 6px rgba(0,0,0,.9), 0 0 12px rgba(0,0,0,.6);
  font-variant-numeric: tabular-nums;
  pointer-events: none;
  transition: color .2s;
}
.cd-center.charging {
  color: #ffd060;
  text-shadow: 0 0 10px rgba(255,180,30,.7), 0 1px 4px rgba(0,0,0,.9);
}

/* 主数值 pill（顶部居中绝对定位） */
.card-stat {
  position: absolute; top: 4px;
  left: 50%; transform: translateX(-50%);
  padding: 1px 5px; border-radius: 4px;
  font-size: 9px; font-weight: 900; color: #fff;
  text-shadow: 0 1px 2px rgba(0,0,0,.5);
  white-space: nowrap; pointer-events: none; z-index: 3; line-height: 1.4;
}
.stat-damage { background: rgba(200,30,30,.9); }
.stat-burn   { background: rgba(200,30,30,.9); }
.stat-poison { background: rgba(20,100,30,.9); }
.stat-heal   { background: rgba(40,170,60,.9); }
.stat-shield { background: rgba(180,140,0,.9); }
.stat-crit   { background: rgba(160,100,0,.9); }

/* 数值增长时的脉冲动画 */
@keyframes stat-growth-pulse {
  0%   { transform: translateX(-50%) scale(1); box-shadow: none; }
  35%  { transform: translateX(-50%) scale(1.35); box-shadow: 0 0 8px 3px rgba(255,210,50,.8); }
  100% { transform: translateX(-50%) scale(1); box-shadow: none; }
}
.card-stat.stat-growth-flash {
  animation: stat-growth-pulse .5s ease-out;
}

/* 被充能时蓝白闪光（0.5s）*/
@keyframes card-charge-flash {
  0%   { box-shadow: none; border-color: rgba(255,255,255,.1); }
  20%  { box-shadow: 0 0 0 2px #80d8ff, 0 0 18px 7px rgba(128,216,255,.75); border-color: #80d8ff; }
  100% { box-shadow: none; border-color: rgba(255,255,255,.1); }
}
.arena-card.card-charged {
  animation: card-charge-flash 0.5s ease-out;
}

/* 战斗开始飞入动画 */
@keyframes card-battle-enter {
  0%   { transform: translateY(64px) scale(0.65); opacity: 0; filter: brightness(2.5); }
  55%  { transform: translateY(-16px) scale(1.18); opacity: 1; filter: brightness(1.4); }
  75%  { transform: translateY(-4px) scale(1.04); filter: brightness(1); }
  100% { transform: translateY(0) scale(1); opacity: 1; filter: brightness(1); }
}
.arena-card.battle-entering {
  animation: card-battle-enter 0.65s cubic-bezier(.22,1.8,.36,1) both;
  z-index: 15;
}

/* 战斗中持续漂浮：用 CSS 变量控制错位延迟，不污染其他 animation */
@keyframes card-battle-float {
  0%,100% { transform: translateY(0px)   rotate(0deg);     filter: drop-shadow(0 5px 10px rgba(0,0,0,.6)); }
  45%     { transform: translateY(-9px)  rotate(-0.6deg);  filter: drop-shadow(0 14px 22px rgba(0,0,0,.38)); }
  72%     { transform: translateY(-4px)  rotate(0.4deg);   filter: drop-shadow(0 9px 15px rgba(0,0,0,.5)); }
}
.arena-card.battle-active {
  animation: card-battle-float 2.4s ease-in-out var(--float-delay, 0s) infinite;
}
/* 以下三条：battle-active 存在时，其他瞬态动画必须能覆盖漂浮 */
.arena-card.battle-active.triggering {
  animation: card-trigger-pulse .50s ease-out;
}
.arena-card.battle-active.card-special {
  animation:
    card-special-enter  0.20s ease-out,
    card-special-active 0.50s 0.20s ease-in-out infinite;
}
.arena-card.battle-active.card-charged {
  animation: card-charge-flash 0.5s ease-out;
}

/* 底部渐变叠层 */
.card-bottom {
  position: absolute; bottom: 0; left: 0; right: 0;
  padding: 12px 5px 4px;
  background: linear-gradient(to bottom, transparent 0%, rgba(0,0,0,.85) 100%);
  z-index: 2;
}
.card-name {
  font-size: 9px; font-weight: bold; color: rgba(255,255,255,.9);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

</style>
