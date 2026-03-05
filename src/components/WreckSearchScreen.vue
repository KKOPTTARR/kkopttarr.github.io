<template>
  <div class="wreck-screen">
    <PanelStatus :lives="lives" :max-lives="maxLives" :battle-count="battleCount" />

    <div class="wreck-header">
      <span class="wreck-title">⚓ 残骸搜寻</span>
    </div>

    <div class="card-stage">
      <div class="stage-sub">{{ flipped ? '发现了一件宝物！' : '从沉船残骸中打捞一件宝物' }}</div>

      <div class="flip-wrap">
        <div class="flip-card" :class="{ flipped }" @click="onFlip">

          <!-- 背面 -->
          <div class="flip-face flip-back">
            <div class="back-anchor" :style="{ color: typeColor }">⚓</div>
            <div v-if="itemType" class="back-type" :style="{ color: typeColor, borderColor: typeColor }">{{ itemType }}</div>
            <div class="back-hint">点击打捞</div>
          </div>

          <!-- 正面 -->
          <div class="flip-face flip-front" :class="`card-${item?.tier?.toLowerCase()}`">
            <img v-if="item" :src="getIconUrl(item.name_en, item.tier)" class="item-img" draggable="false" />
            <div v-if="item" class="item-tier" :class="`tier-${item.tier.toLowerCase()}`">
              {{ TIER_LABELS[item.tier] }}
            </div>
            <div v-if="item" class="item-name" :class="`name-${item.tier.toLowerCase()}`">{{ item.name_cn }}</div>
            <div v-if="item?.tags?.length" class="item-tags">
              <span v-for="tag in item.tags" :key="tag" class="tag-chip">{{ tag }}</span>
            </div>
            <div v-if="item" class="item-skill" v-html="parseSkill(item.skill_cn)" />
          </div>

        </div>
      </div>

      <button
        class="take-btn"
        :class="{ visible: flipped, full: inventoryFull }"
        :disabled="!flipped || inventoryFull"
        @click="onConfirm"
      >
        {{ inventoryFull ? '背包已满' : '带走' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { getIconUrl } from '../data/items.js'
import { TIER_LABELS } from '../data/tiers.js'
import { parseSkill } from '../utils.js'
import { WRECK_TYPE_COLORS } from '../composables/useEventSystem.js'
import PanelStatus from './PanelStatus.vue'

const props = defineProps({
  candidates:    { type: Array,   default: () => [] },
  lives:         Number,
  maxLives:      Number,
  battleCount:   Number,
  inventoryFull: { type: Boolean, default: false },
})

const emit = defineEmits(['select'])

const item = computed(() => props.candidates[0] ?? null)
const itemType = computed(() => item.value?.tags?.[0] ?? null)
const typeColor = computed(() => itemType.value ? (WRECK_TYPE_COLORS[itemType.value] ?? '#9e8060') : '#9e8060')
const flipped = ref(false)

function onFlip() {
  if (flipped.value) return
  flipped.value = true
}

function onConfirm() {
  if (!item.value) return
  emit('select', item.value)
}
</script>

<style scoped>
.wreck-screen {
  position: fixed; top: 0; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 600px; z-index: 200;
  display: flex; flex-direction: column;
  background:
    linear-gradient(180deg,
      rgba(0,0,0,.75) 0%,
      rgba(2,8,18,.45) 18%,
      rgba(2,8,18,.40) 80%,
      rgba(0,0,0,.70) 100%),
    url('/background/bg-treasure-map.png') center 40% / cover no-repeat;
}

.wreck-header {
  flex-shrink: 0;
  padding: 14px 14px 10px;
  border-bottom: 1px solid var(--panel-border);
  text-align: center;
}
.wreck-title { font-size: 22px; font-weight: bold; color: var(--gold); letter-spacing: 1px; }

/* ── 舞台区 ── */
.card-stage {
  flex: 1;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 24px;
  padding: 24px 16px;
}

.stage-sub {
  font-size: 13px; color: #9e8060;
  min-height: 18px;
  transition: color .3s;
}

/* ── 翻牌容器 ── */
.flip-wrap {
  perspective: 900px;
}

.flip-card {
  width: 200px; height: 280px;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.65s cubic-bezier(.4,0,.2,1);
  cursor: pointer;
}
.flip-card.flipped {
  transform: rotateY(180deg);
  cursor: default;
}

/* ── 两面共用 ── */
.flip-face {
  position: absolute; inset: 0;
  border-radius: 16px;
  backface-visibility: hidden;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px; padding: 16px 12px;
  text-align: center;
}

/* ── 背面 ── */
.flip-back {
  background: linear-gradient(160deg, rgba(20,12,4,.90), rgba(12,6,2,.95));
  border: 2px solid rgba(160,90,30,.45);
  box-shadow: 0 8px 32px rgba(0,0,0,.6), inset 0 1px 0 rgba(200,130,40,.08);
}
.flip-card:not(.flipped):hover .flip-back {
  border-color: rgba(200,134,10,.7);
  box-shadow: 0 12px 40px rgba(0,0,0,.6), 0 0 20px rgba(180,110,20,.15);
}

.back-anchor {
  font-size: 72px; line-height: 1;
  opacity: .18;
  filter: sepia(1);
}
.back-type {
  font-size: 13px; font-weight: bold; letter-spacing: 2px;
  padding: 3px 14px; border-radius: 20px;
  border: 1px solid;
  opacity: .85;
}
.back-hint {
  font-size: 13px; color: rgba(180,130,60,.55); letter-spacing: 1px;
}

/* ── 正面（各品质） ── */
.flip-front {
  transform: rotateY(180deg);
}
.card-bronze  { background: linear-gradient(160deg, rgba(46,26,8,.92),  rgba(30,16,8,.96));  border: 2px solid rgba(180,110,20,.55); box-shadow: 0 8px 28px rgba(0,0,0,.5); }
.card-silver  { background: linear-gradient(160deg, rgba(26,26,46,.92), rgba(16,16,30,.96)); border: 2px solid rgba(160,160,200,.45); box-shadow: 0 8px 28px rgba(0,0,0,.5); }
.card-gold    { background: linear-gradient(160deg, rgba(40,30,4,.92),  rgba(26,20,4,.96));  border: 2px solid rgba(212,168,32,.55); box-shadow: 0 8px 28px rgba(180,120,0,.2); }
.card-diamond { background: linear-gradient(160deg, rgba(4,26,46,.92),  rgba(4,16,30,.96));  border: 2px solid rgba(60,180,255,.45); box-shadow: 0 8px 28px rgba(30,130,220,.2); }

.item-img { width: 80px; height: 80px; border-radius: 10px; object-fit: cover; }

.item-tier {
  font-size: 11px; font-weight: bold;
  padding: 2px 10px; border-radius: 10px; letter-spacing: .5px;
}
.tier-bronze  { background: rgba(180,110,20,.2);  color: var(--bronze); border: 1px solid rgba(180,110,20,.5); }
.tier-silver  { background: rgba(160,160,200,.15); color: var(--silver); border: 1px solid rgba(160,160,200,.4); }
.tier-gold    { background: rgba(212,168,32,.2);  color: var(--gold);   border: 1px solid rgba(212,168,32,.5); }
.tier-diamond { background: rgba(60,180,255,.15); color: var(--gem);    border: 1px solid rgba(60,180,255,.4); }

.item-name { font-size: 15px; font-weight: 700; }
.name-bronze  { color: var(--bronze); }
.name-silver  { color: var(--silver); }
.name-gold    { color: var(--gold);   }
.name-diamond { color: var(--gem);    }

.item-tags { display: flex; flex-wrap: wrap; gap: 3px; justify-content: center; }
.tag-chip {
  font-size: 9px; color: #8aaa68;
  background: rgba(80,100,40,.2);
  border: 1px solid rgba(100,140,50,.3);
  border-radius: 4px; padding: 1px 6px;
}

.item-skill {
  font-size: 10px; color: #8a9aaa;
  line-height: 1.5; padding: 0 4px;
}

/* ── 带走按钮 ── */
.take-btn {
  padding: 12px 48px; border-radius: 10px;
  font-size: 15px; font-weight: bold; font-family: inherit;
  cursor: pointer;
  background: linear-gradient(135deg, #5a3a08, #a06810);
  color: #f0d880; border: 1px solid #c8860a;
  box-shadow: 0 2px 10px rgba(180,110,20,.3);
  opacity: 0; transform: translateY(8px);
  transition: opacity .4s .2s, transform .4s .2s, filter .12s;
  pointer-events: none;
}
.take-btn.visible {
  opacity: 1; transform: translateY(0);
  pointer-events: auto;
}
.take-btn:not(.full):hover { filter: brightness(1.15); }
.take-btn.full { background: linear-gradient(135deg, #2a1a1a, #4a2020); color: #a06060; border-color: #6a3030; cursor: not-allowed; }
</style>
