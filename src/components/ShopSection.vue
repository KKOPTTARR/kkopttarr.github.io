<template>
  <div class="shop-section">
    <div class="shop-items">
      <div
        v-for="(item, idx) in slots"
        :key="idx"
        class="shop-card"
        :class="[item ? `tier-${item.tier}` : '', { sold: !item, 'no-afford': item && gold < item.price }]"
        :style="{ flex: 1 }"
        @pointerdown.prevent="item && onCardPointerDown($event, item, idx)"
      >
        <template v-if="item">
          <!-- 全出血艺术图 -->
          <img
            v-if="!iconErrors[idx]"
            :src="getIconUrl(item.name_en, item.tier)"
            :alt="item.name_cn"
            class="card-art"
            draggable="false"
            @error="iconErrors[idx] = true"
          />
          <div v-else class="card-art-fallback">📦</div>

          <!-- 顶部：多重触发徽章（左） + 品级徽章（右） -->
          <div class="card-top">
            <span v-if="item.hits > 1" class="multi-hit-badge">×{{ item.hits }}</span>
            <span v-else></span>
            <span :class="`tier-badge tier-badge-${item.tier}`">{{ TIER_LABELS[item.tier] }}</span>
          </div>

          <!-- 主数值 pill（顶部居中） -->
          <div v-if="primaryStat(item)" class="card-stat" :class="`stat-${primaryStatType(item)}`">
            {{ primaryStat(item) }}
          </div>

          <!-- 底部渐变叠层：名称 + 属性 + 价格 -->
          <div class="card-bottom">
            <div class="card-name">{{ item.name_cn }}</div>
            <div class="card-row">
              <span class="card-left-info">
                <span class="card-cd">⏱{{ cdLabel(item) }}</span>
                <span class="card-stats">{{ statLine(item) }}</span>
              </span>
              <span class="card-price" :class="{ affordable: gold >= item.price }">
                💰{{ item.price }}
              </span>
            </div>
          </div>
        </template>
        <span v-else class="slot-empty">— 已售 —</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { getIconUrl } from '../data/items.js'
import { startDrag } from '../composables/useDrag.js'

const props = defineProps({
  slots: { type: Array,  required: true },
  gold:  { type: Number, required: true },
})

const iconErrors = ref(Array(10).fill(false))

const TIER_LABELS = { Bronze: '铜', Silver: '银', Gold: '金', Diamond: '钻' }

function cdLabel(item) {
  if (!item.cooldown) return '—'
  const s = item.cooldown / 1000
  return `${s}s`
}

function statLine(item) {
  const parts = []
  if (item.damage)          parts.push(`⚔️${item.damage}`)
  if (item.heal)            parts.push(`💚${item.heal}`)
  if (item.shield)          parts.push(`🛡${item.shield}`)
  if (item.burn)            parts.push(`🔥${item.burn}`)
  if (item.poison)          parts.push(`☠${item.poison}`)
  if (item.globalCritBonus) parts.push(`🎯+${Math.round(item.globalCritBonus * 100)}%`)
  return parts.join('  ')
}

function primaryStatType(item) {
  if (item.damage        > 0) return 'damage'
  if (item.heal          > 0) return 'heal'
  if (item.shield        > 0) return 'shield'
  if (item.burn          > 0) return 'burn'
  if (item.poison        > 0) return 'poison'
  if (item.globalCritBonus)   return 'crit'
  return null
}

function primaryStat(item) {
  if (item.damage        > 0) return item.damage
  if (item.heal          > 0) return `+${item.heal}`
  if (item.shield        > 0) return item.shield
  if (item.burn          > 0) return item.burn
  if (item.poison        > 0) return item.poison
  if (item.globalCritBonus)   return `+${Math.round(item.globalCritBonus * 100)}%`
  return null
}

function onCardPointerDown(e, item, idx) {
  startDrag(e, item, 'shop', idx)
}
</script>

<style scoped>
.shop-section { width: 100%; }

.shop-items {
  display: flex;
  gap: 6px;
}

/* ── 卡片容器 ── */
.shop-card {
  flex: 1;
  aspect-ratio: 3 / 4;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
  cursor: grab;
  touch-action: none;
  border: 3px solid transparent;
  transition: transform .12s, box-shadow .12s;
  background: rgba(12,8,4,.80);
}
.shop-card:active { cursor: grabbing; }
.shop-card:hover:not(.sold):not(.no-afford) { transform: translateY(-3px); }
.shop-card.no-afford {
  cursor: not-allowed;
  filter: brightness(.5) saturate(.35);
}
.shop-card.sold {
  border: 2px dashed rgba(160,80,20,.20);
  cursor: default;
  display: flex; align-items: center; justify-content: center;
  background: rgba(10,6,2,.40);
}
.slot-empty { color: rgba(160,80,20,.45); font-size: 12px; }

/* ── 全出血艺术图 ── */
.card-art {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
  display: block;
}
.card-art-fallback {
  position: absolute;
  inset: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 40px;
  background: #160c04;
}

/* ── 顶部：多重触发徽章 + 品级徽章 ── */
.card-top {
  position: absolute;
  top: 6px; left: 6px; right: 6px;
  display: flex; justify-content: space-between; align-items: flex-start;
  z-index: 2;
}
.multi-hit-badge {
  font-size: 11px; font-weight: bold;
  padding: 2px 6px; border-radius: 8px;
  background: rgba(255,140,0,.85);
  color: #fff;
  text-shadow: 0 1px 2px rgba(0,0,0,.6);
  letter-spacing: 0.5px;
  backdrop-filter: blur(2px);
}

/* 品级文字徽章 */
.tier-badge {
  font-size: 10px; font-weight: 900;
  padding: 2px 6px; border-radius: 6px;
  letter-spacing: 0.5px;
  backdrop-filter: blur(4px);
  border: 1px solid transparent;
  text-shadow: 0 1px 3px rgba(0,0,0,.8);
}
.tier-badge-Bronze {
  background: rgba(180,80,0,.75);
  color: #ffb060;
  border-color: rgba(255,120,20,.5);
}
.tier-badge-Silver {
  background: rgba(60,80,100,.75);
  color: #d8e8f4;
  border-color: rgba(180,210,240,.4);
}
.tier-badge-Gold {
  background: rgba(120,80,0,.75);
  color: #ffd700;
  border-color: rgba(255,210,0,.5);
}
.tier-badge-Diamond {
  background: rgba(0,40,80,.75);
  color: #80e8ff;
  border-color: rgba(0,200,255,.5);
}

/* ── 主数值 pill（顶部居中绝对定位） ── */
.card-stat {
  position: absolute; top: 6px;
  left: 50%; transform: translateX(-50%);
  padding: 2px 7px; border-radius: 5px;
  font-size: 11px; font-weight: 900; color: #fff;
  text-shadow: 0 1px 2px rgba(0,0,0,.5);
  white-space: nowrap; z-index: 3; line-height: 1.4;
  pointer-events: none;
}
.stat-damage { background: rgba(200,30,30,.9); }
.stat-burn   { background: rgba(200,30,30,.9); }
.stat-poison { background: rgba(20,100,30,.9); }
.stat-heal   { background: rgba(40,170,60,.9); }
.stat-shield { background: rgba(180,140,0,.9); }
.stat-crit   { background: rgba(160,100,0,.9); }

/* ── 底部渐变叠层 ── */
.card-bottom {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  padding: 20px 8px 8px;
  background: linear-gradient(to bottom,
    transparent 0%,
    rgba(0,0,0,.65) 35%,
    rgba(0,0,0,.88) 100%
  );
  z-index: 2;
}
.card-name {
  font-size: 12px;
  font-weight: bold;
  color: #fff;
  text-shadow: 0 1px 4px rgba(0,0,0,.9);
  margin-bottom: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.card-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.card-left-info {
  display: flex;
  align-items: center;
  gap: 5px;
}
.card-cd {
  font-size: 10px;
  font-weight: bold;
  color: rgba(130,200,255,.85);
  text-shadow: 0 1px 3px rgba(0,0,0,.8);
  white-space: nowrap;
}
.card-stats {
  font-size: 10px;
  color: rgba(255,255,255,.75);
  text-shadow: 0 1px 3px rgba(0,0,0,.8);
}
.card-price {
  font-size: 11px;
  font-weight: bold;
  color: rgba(255,220,80,.5);
  text-shadow: 0 1px 3px rgba(0,0,0,.8);
}
.card-price.affordable { color: #ffd700; }
</style>
