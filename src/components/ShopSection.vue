<template>
  <div class="shop-section">
    <div class="shop-items">
      <div
        v-for="(item, idx) in slots"
        :key="idx"
        class="shop-card"
        :class="{ sold: !item, 'no-afford': item && gold < item.price }"
        :style="{ flex: 1 }"
        @pointerdown.prevent="item && onCardPointerDown($event, item, idx)"
      >
        <template v-if="item">
          <!-- 全出血艺术图 -->
          <img
            v-if="!iconErrors[idx]"
            :src="getIconUrl(item.name_en)"
            :alt="item.name_cn"
            class="card-art"
            draggable="false"
            @error="iconErrors[idx] = true"
          />
          <div v-else class="card-art-fallback">📦</div>

          <!-- 顶部：多重触发徽章 + 品级点 -->
          <div class="card-top">
            <span v-if="item.hits > 1" class="multi-hit-badge">×{{ item.hits }}</span>
            <span class="tier-dot" :style="tierDotStyle(item.tier)"></span>
          </div>

          <!-- 底部渐变叠层：名称 + 属性 + 价格 -->
          <div class="card-bottom">
            <div class="card-name">{{ item.name_cn }}</div>
            <div class="card-row">
              <span class="card-stats">{{ statLine(item) }}</span>
              <span class="card-price" :class="{ affordable: gold >= item.price }">
                💰{{ item.price }}
              </span>
            </div>
          </div>

          <!-- 品级底边色条 -->
          <div class="tier-bar" :style="tierBarStyle(item.tier)"></div>
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

const emit = defineEmits(['buy'])

const iconErrors = ref(Array(10).fill(false))

function statLine(item) {
  const parts = []
  if (item.damage)  parts.push(`⚔️${item.damage}`)
  if (item.heal)    parts.push(`💚${item.heal}`)
  if (item.shield)  parts.push(`🛡${item.shield}`)
  if (item.burn)    parts.push(`🔥${item.burn}`)
  if (item.poison)  parts.push(`☠${item.poison}`)
  return parts.join('  ')
}

const TIER_COLORS = { Bronze: '#cd7f32', Silver: '#c0c0c0', Gold: '#ffd700', Diamond: '#b9f2ff' }

function tierBarStyle(tier) {
  return { background: TIER_COLORS[tier] || '#888' }
}
function tierDotStyle(tier) {
  return { background: TIER_COLORS[tier] || '#888' }
}

function onCardPointerDown(e, item, idx) {
  if (props.gold < item.price) return
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
  height: 155px;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
  cursor: grab;
  touch-action: none;
  border: 1px solid rgba(180,100,30,.22);
  transition: transform .12s, box-shadow .12s;
  background: rgba(12,8,4,.80);
  box-shadow: 0 2px 8px rgba(0,0,0,.45), inset 0 1px 0 rgba(200,130,40,.08);
}
.shop-card:active { cursor: grabbing; }
.shop-card:hover:not(.sold):not(.no-afford) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0,0,0,.6), 0 0 0 1px rgba(200,134,10,.4);
}
.shop-card.no-afford {
  cursor: not-allowed;
  filter: brightness(.55) saturate(.4);
}
.shop-card.sold {
  border-style: dashed;
  border-color: rgba(160,80,20,.20);
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
  object-fit: cover;
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

/* ── 顶部：尺寸徽章 + 品级点 ── */
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
.size-badge {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(0,0,0,.65);
  color: rgba(255,255,255,.7);
  backdrop-filter: blur(2px);
}
.tier-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  box-shadow: 0 0 6px currentColor;
}

/* ── 底部渐变叠层 ── */
.card-bottom {
  position: absolute;
  bottom: 3px; left: 0; right: 0;
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

/* ── 品级底边色条 ── */
.tier-bar {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 3px;
  z-index: 3;
}
</style>
