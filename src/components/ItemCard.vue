<template>
  <div
    class="item-card"
    :class="[
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
    @mouseenter="emit('hover-enter', item)"
    @mouseleave="emit('hover-leave')"
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

    <!-- 主数值 overlay（顶部居中） -->
    <div v-if="mainStat" class="compact-stat" :class="`stat-${statType}`">{{ mainStat }}</div>

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
const iconUrl  = computed(() => getIconUrl(props.item.name_en, props.item.tier))

const fallbackEmoji = computed(() => {
  const t = props.item.tags?.[0] || ''
  if (t.includes('武器') || t.includes('枪')) return '⚔️'
  if (t.includes('防具')) return '🛡'
  if (t.includes('水系')) return '🐟'
  return '📦'
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

// compact 模式下显示最关键的一个数值
const mainStat = computed(() => {
  const i = props.item
  if (i.damage  > 0) return i.damage
  if (i.heal    > 0) return `+${i.heal}`
  if (i.shield  > 0) return i.shield
  if (i.burn    > 0) return i.burn
  if (i.poison  > 0) return i.poison
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
</script>

<style scoped>
/* compact 模式下的 stat overlay */
.compact-stat {
  position: absolute; top: 3px;
  left: 50%; transform: translateX(-50%);
  padding: 1px 5px; border-radius: 4px;
  font-size: 10px; font-weight: 900; color: #fff;
  text-shadow: 0 1px 2px rgba(0,0,0,.5);
  white-space: nowrap; pointer-events: none; z-index: 5; line-height: 1.3;
}
.compact-stat.stat-damage { background: rgba(200,30,30,.9); }
.compact-stat.stat-burn   { background: rgba(200,30,30,.9); }
.compact-stat.stat-poison { background: rgba(20,100,30,.9); }
.compact-stat.stat-heal   { background: rgba(40,170,60,.9); }
.compact-stat.stat-shield { background: rgba(180,140,0,.9); }
/* compact 冷却条更细 */
.cd-compact { height: 3px; }
</style>
