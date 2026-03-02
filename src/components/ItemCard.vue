<template>
  <div
    class="item-card"
    :class="[
      `tier-${item.tier}`,
      chargeClass,
      {
        dragging:        isDragging,
        triggering:      item.triggering,
        frozen:          item.frozenMs > 0,
        'is-enemy':      isEnemy,
        'neighbor-lit':  neighborHighlight,
        'compact-card':  compact,
      }
    ]"
    :style="cardStyle"
    :data-instance="item.instanceId"
    @pointerdown.prevent="onPointerDown"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <!-- 图标区 -->
    <div class="item-icon-wrap" :style="iconWrapStyle">
      <img
        v-if="!imgError"
        :src="iconUrl"
        :alt="item.name_cn"
        class="item-icon"
        @error="imgError = true"
        draggable="false"
      />
      <span v-else class="item-icon-fallback">{{ fallbackEmoji }}</span>
    </div>

    <!-- 名称（compact 时隐藏） -->
    <div v-if="!compact" class="item-name">{{ item.name_cn }}</div>

    <!-- 冷却条 -->
    <div v-if="isBattle" class="cooldown-track" :class="{ 'cd-compact': compact }">
      <div
        class="cooldown-fill"
        :style="{ width: cooldownPct + '%', background: cooldownColor }"
      ></div>
    </div>

    <!-- 状态徽章 -->
    <div class="status-badges">
      <span v-if="item.burnStacks   > 0" class="badge burn-badge">🔥{{ item.burnStacks }}</span>
      <span v-if="item.poisonStacks > 0" class="badge poison-badge">☠{{ item.poisonStacks }}</span>
      <span v-if="item.frozenMs     > 0" class="badge freeze-badge">❄️</span>
    </div>

    <!-- compact 模式下的伤害数字 overlay -->
    <div v-if="compact && mainStat" class="compact-stat">{{ mainStat }}</div>

    <!-- 充能光环 -->
    <div v-if="chargeClass === 'charge-critical'" class="charge-aura"></div>

    <!-- 二合一系统：获得第2件时立即升级，无堆叠显示 -->
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { getIconUrl } from '../data/items.js'
import { dragState, startDrag } from '../composables/useDrag.js'

const props = defineProps({
  item:              { type: Object,  required: true },
  gridCol:           { type: Number,  default: 0 },
  gridRow:           { type: Number,  default: 0 },
  cellSize:          { type: Number,  default: 58 },
  cellHeight:        { type: Number,  default: 0 },   // 0 = same as cellSize
  cellGap:           { type: Number,  default: 4 },
  isEnemy:           { type: Boolean, default: false },
  isBattle:          { type: Boolean, default: false },
  compact:           { type: Boolean, default: false },
  shopMode:          { type: Boolean, default: false },
  neighborHighlight: { type: Boolean, default: false },
  stack:             { type: Number,  default: 1 },   // 同名物品数量，2 时显示 ×2
})

const emit = defineEmits(['hover-enter', 'hover-leave'])

const imgError = ref(false)
const iconUrl  = computed(() => getIconUrl(props.item.name_en))

const fallbackEmoji = computed(() => {
  const t = props.item.tags?.[0] || ''
  if (t.includes('武器') || t.includes('枪')) return '⚔️'
  if (t.includes('防具')) return '🛡'
  if (t.includes('水系')) return '🐟'
  return '📦'
})

// compact 模式下显示最关键的一个数值
const mainStat = computed(() => {
  const i = props.item
  if (i.damage  > 0) return i.damage
  if (i.heal    > 0) return `+${i.heal}`
  if (i.shield  > 0) return `🛡${i.shield}`
  if (i.burn    > 0) return `🔥${i.burn}`
  if (i.poison  > 0) return `☠${i.poison}`
  return null
})

const C = computed(() => props.cellSize)
const G = computed(() => props.cellGap)

// 2行×4列网格，每格 1×1
const cardStyle = computed(() => {
  if (props.shopMode) return {}
  const C_ = C.value, G_ = G.value
  const H_ = props.cellHeight > 0 ? props.cellHeight : C_
  return {
    left:   props.gridCol * (C_ + G_) + 'px',
    top:    props.gridRow * (H_ + G_) + 'px',
    width:  C_ + 'px',
    height: H_ + 'px',
  }
})

const iconWrapStyle = computed(() => {
  if (props.shopMode) return {}
  const C_ = C.value
  const H_ = props.cellHeight > 0 ? props.cellHeight : C_
  const nameH = props.compact ? 0 : 14
  const cdH   = props.isBattle ? (props.compact ? 3 : 4) : 0
  return { height: (H_ - nameH - cdH) + 'px' }
})

const cooldownPct = computed(() =>
  props.item.cooldown > 0
    ? Math.min(100, (props.item.cooldownProgress / props.item.cooldown) * 100)
    : 0
)

// 只在接近满充（>88%）时才显示充能特效，避免所有卡片同时闪烁
const chargeClass = computed(() => {
  if (!props.isBattle) return ''
  return cooldownPct.value >= 88 ? 'charge-critical' : ''
})

const cooldownColor = computed(() => {
  const p = cooldownPct.value
  if (p >= 90) return 'linear-gradient(90deg,#e67e22,#f39c12,#ffd700)'
  if (p >= 65) return 'linear-gradient(90deg,#2471a3,#f39c12)'
  return 'linear-gradient(90deg,#2471a3,#5dade2)'
})

const isDragging = computed(() =>
  dragState.active && dragState.sourceInstanceId === props.item.instanceId
)

function onPointerDown(e) {
  if (props.isEnemy || props.isBattle || props.shopMode) return
  startDrag(e, props.item, 'grid', props.item.instanceId)
}

function onMouseEnter(e) { emit('hover-enter', props.item); showTooltip(e) }
function onMouseLeave()   { emit('hover-leave'); document.getElementById('item-tooltip')?.classList.add('hidden') }

function showTooltip(e) {
  const tooltip = document.getElementById('item-tooltip')
  if (!tooltip) return
  const item = props.item
  tooltip.querySelector('.tt-name').textContent  = item.name_cn
  tooltip.querySelector('.tt-tags').textContent  = item.tags?.join(' · ') || ''
  const stats = []
  if (item.damage)  stats.push(`⚔️ ${item.damage}`)
  if (item.heal)    stats.push(`💚 ${item.heal}`)
  if (item.shield)  stats.push(`🛡 ${item.shield}`)
  if (item.burn)    stats.push(`🔥 ${item.burn}`)
  if (item.poison)  stats.push(`☠ ${item.poison}`)
  stats.push(`⏱ ${item.cooldown / 1000}s`)
  tooltip.querySelector('.tt-stats').textContent = stats.join('  ')
  tooltip.querySelector('.tt-skill').textContent = item.skill_cn || ''
  tooltip.classList.remove('hidden')
  const m = 10, W = window.innerWidth, H = window.innerHeight
  let x = e.clientX + m, y = e.clientY + m
  if (x + tooltip.offsetWidth  > W - m) x = e.clientX - tooltip.offsetWidth  - m
  if (y + tooltip.offsetHeight > H - m) y = e.clientY - tooltip.offsetHeight - m
  tooltip.style.left = x + 'px'; tooltip.style.top = y + 'px'
}
</script>

<style scoped>
/* compact 模式下的 stat overlay */
.compact-stat {
  position: absolute; bottom: 3px; right: 3px;
  font-size: 10px; font-weight: 900; color: #ff6868;
  text-shadow: 0 0 4px rgba(0,0,0,.8);
  line-height: 1; pointer-events: none; z-index: 5;
}
/* compact 冷却条更细 */
.cd-compact { height: 3px; }
</style>
