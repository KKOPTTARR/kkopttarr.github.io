<template>
  <div class="blind-trade-screen">

    <PanelStatus :lives="lives" :max-lives="maxLives" :battle-count="battleCount" />

    <!-- 标题区 -->
    <div class="select-header">
      <div class="select-title">🕵️ 开盲盒</div>
      <div class="select-sub">三张背面牌，只知道类型，选一张翻开带走</div>
      <button class="skip-btn" @click="$emit('skip')">跳过</button>
    </div>

    <!-- 背包满提示 -->
    <div v-if="inventoryFull" class="full-warning">🎒 背包已满，请先丢弃物品</div>

    <!-- 三列竖卡片 -->
    <div class="select-cards">
      <div
        v-for="(item, i) in candidates"
        :key="i"
        class="card-float-wrap"
        :class="{ 'float-active': revealedIdx !== i }"
        :style="{ '--float-delay': `${-i * 0.8}s` }"
      >
        <div
          class="blind-card"
          :class="[revealedIdx === i ? `card-${item.tier.toLowerCase()}` : 'card-hidden', { revealed: revealedIdx === i, 'card-disabled': inventoryFull && revealedIdx !== i }]"
          :style="revealedIdx !== i ? getTagCardStyle(item.tags?.[0]) : {}"
          @click="onPick(i, item)"
        >
          <!-- 背面 -->
          <template v-if="revealedIdx !== i">
            <div class="card-back-icon" :style="getTagIconStyle(item.tags?.[0])">?</div>
            <div class="card-tag-badge" :style="getTagBadgeStyle(item.tags?.[0])">{{ item.tags?.[0] ?? '未知' }}</div>
            <div class="card-hint">点击翻开</div>
          </template>

          <!-- 正面 -->
          <template v-else>
            <img :src="getIconUrl(item.name_en, item.tier)" class="card-portrait" draggable="false" />
            <div class="card-tier" :class="`tier-${item.tier.toLowerCase()}`">{{ TIER_LABELS[item.tier] }}</div>
            <div class="card-name" :class="`name-${item.tier.toLowerCase()}`">{{ item.name_cn }}</div>
            <div v-if="item.tags?.length" class="card-tags">
              <span v-for="tag in item.tags" :key="tag" class="tag-chip">{{ tag }}</span>
            </div>
            <div class="card-skill" v-html="parseSkill(item.skill_cn)" />
          </template>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref } from 'vue'
import { getIconUrl } from '../data/items.js'
import { TIER_LABELS } from '../data/tiers.js'
import { parseSkill } from '../utils.js'
import PanelStatus from './PanelStatus.vue'

const props = defineProps({
  candidates:    { type: Array,   default: () => [] },
  lives:         Number,
  maxLives:      Number,
  battleCount:   Number,
  inventoryFull: { type: Boolean, default: false },
})

const emit = defineEmits(['select', 'skip'])

const revealedIdx = ref(-1)

const TAG_COLORS = {
  '工具': { r: 80,  g: 140, b: 220 },
  '伙伴': { r: 60,  g: 180, b: 100 },
  '防具': { r: 100, g: 100, b: 220 },
  '食物': { r: 210, g: 130, b: 40  },
  '枪械': { r: 200, g: 60,  b: 60  },
  '武器': { r: 210, g: 90,  b: 40  },
  '载具': { r: 40,  g: 180, b: 200 },
  '科技': { r: 160, g: 60,  b: 220 },
}
const DEFAULT_COLOR = { r: 120, g: 60, b: 200 }

function getColor(tag) {
  return TAG_COLORS[tag] ?? DEFAULT_COLOR
}

function getTagCardStyle(tag) {
  const { r, g, b } = getColor(tag)
  return {
    background: `linear-gradient(160deg, rgba(${r*.15|0},${g*.1|0},${b*.15|0},.88), rgba(${r*.08|0},${g*.05|0},${b*.08|0},.92))`,
    border: `1px solid rgba(${r},${g},${b},.45)`,
    boxShadow: `0 4px 16px rgba(0,0,0,.5), 0 0 20px rgba(${r},${g},${b},.08)`,
  }
}

function getTagIconStyle(tag) {
  const { r, g, b } = getColor(tag)
  return { color: `rgba(${r},${g},${b},.25)` }
}

function getTagBadgeStyle(tag) {
  const { r, g, b } = getColor(tag)
  return {
    color: `rgba(${r+40},${g+40},${b+40},1)`,
    background: `rgba(${r},${g},${b},.15)`,
    border: `1px solid rgba(${r},${g},${b},.35)`,
  }
}

function onPick(i, item) {
  if (revealedIdx.value !== -1 || props.inventoryFull) return
  revealedIdx.value = i
  setTimeout(() => emit('select', item), 700)
}
</script>

<style scoped>
.blind-trade-screen {
  position: fixed; top: 0; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 600px; z-index: 200;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background:
    linear-gradient(180deg,
      rgba(0,0,0,.60) 0%,
      rgba(10,4,28,.72) 15%,
      rgba(10,4,28,.72) 85%,
      rgba(0,0,0,.60) 100%),
    url('/background/bg-treasure-map.png') center 40% / cover no-repeat;
  gap: 16px;
}

/* ── 标题区 ── */
.select-header {
  text-align: center;
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  background: rgba(4,2,12,.75);
  backdrop-filter: blur(8px);
  padding: 12px 24px; border-radius: 12px;
  border: 1px solid rgba(120,60,200,.25);
  width: calc(100% - 32px); max-width: 700px;
}
.select-title {
  font-size: 26px; font-weight: 700;
  color: #c0a0f0;
  text-shadow: 0 0 12px rgba(160,80,255,.4);
  letter-spacing: 1px;
}
.select-sub { font-size: 13px; color: #7060a0; }

.skip-btn {
  padding: 5px 16px; border-radius: 6px; font-size: 12px;
  cursor: pointer; font-family: inherit;
  border: 1px solid rgba(120,60,200,.35);
  background: rgba(255,255,255,.06);
  color: #7060a0;
  transition: border-color .14s, color .14s;
}
.skip-btn:hover { border-color: #a080e0; color: #c0a0f0; }

/* ── 浮动动画 ── */
@keyframes card-blind-float {
  0%,100% { transform: translateY(0px)  rotate(0deg);   filter: drop-shadow(0 6px 12px rgba(0,0,0,.55)); }
  45%     { transform: translateY(-9px) rotate(-0.5deg); filter: drop-shadow(0 16px 24px rgba(0,0,0,.35)); }
}

/* ── 卡片组 ── */
.select-cards {
  display: flex; gap: 12px;
  width: calc(100% - 32px); max-width: 700px;
  align-items: stretch;
  height: 320px;
}

/* ── 浮动包装层 ── */
.card-float-wrap {
  flex: 1;
  display: flex;
}
.card-float-wrap.float-active {
  animation: card-blind-float 2.6s ease-in-out var(--float-delay, 0s) infinite;
}

/* ── 单张卡片 ── */
.blind-card {
  flex: 1;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px;
  padding: 20px 10px;
  border-radius: 14px;
  cursor: pointer;
  backdrop-filter: blur(4px);
  transition: transform .18s, border-color .18s, box-shadow .18s;
  text-align: center;
}

/* 背面（颜色由 inline style 提供，此处仅 hover 效果） */
.card-hidden:hover {
  transform: translateY(-6px);
}

/* 正面（各品质） */
.card-bronze  { background: linear-gradient(160deg, rgba(46,26,8,.85), rgba(30,16,8,.9));  border: 1px solid rgba(180,110,20,.55); box-shadow: 0 4px 16px rgba(0,0,0,.5); }
.card-silver  { background: linear-gradient(160deg, rgba(26,26,46,.85), rgba(16,16,30,.9)); border: 1px solid rgba(160,160,200,.45); box-shadow: 0 4px 16px rgba(0,0,0,.5); }
.card-gold    { background: linear-gradient(160deg, rgba(40,30,4,.85),  rgba(26,20,4,.9));  border: 1px solid rgba(212,168,32,.55); box-shadow: 0 4px 16px rgba(180,120,0,.2); }
.card-diamond { background: linear-gradient(160deg, rgba(4,26,46,.85),  rgba(4,16,30,.9));  border: 1px solid rgba(60,180,255,.45); box-shadow: 0 4px 16px rgba(30,130,220,.2); }

.blind-card.revealed { cursor: default; }

/* ── 背面内容 ── */
.card-back-icon {
  font-size: 56px; line-height: 1;
  color: rgba(180,120,255,.2); font-weight: 900;
}
.card-tag-badge {
  font-size: 13px; font-weight: bold;
  color: #8060c0; padding: 4px 14px;
  border-radius: 10px;
  background: rgba(120,60,200,.12);
  border: 1px solid rgba(120,60,200,.25);
}
.card-hint { font-size: 11px; color: rgba(150,120,200,.5); }

/* ── 正面内容 ── */
.card-portrait {
  width: 90px; height: 90px;
  border-radius: 10px; object-fit: cover;
}
.card-tier {
  font-size: 11px; font-weight: bold;
  padding: 2px 10px; border-radius: 10px;
  letter-spacing: .5px;
}
.tier-bronze  { background: rgba(180,110,20,.2);  color: var(--bronze); border: 1px solid rgba(180,110,20,.5); }
.tier-silver  { background: rgba(160,160,200,.15); color: var(--silver); border: 1px solid rgba(160,160,200,.4); }
.tier-gold    { background: rgba(212,168,32,.2);  color: var(--gold);   border: 1px solid rgba(212,168,32,.5); }
.tier-diamond { background: rgba(60,180,255,.15); color: var(--gem);    border: 1px solid rgba(60,180,255,.4); }

.card-name {
  font-size: 14px; font-weight: 700; line-height: 1.3;
}
.name-bronze  { color: var(--bronze); }
.name-silver  { color: var(--silver); }
.name-gold    { color: var(--gold);   }
.name-diamond { color: var(--gem);    }

.card-tags {
  display: flex; flex-wrap: wrap; gap: 3px; justify-content: center;
}
.tag-chip {
  font-size: 9px; color: #8aaa68;
  background: rgba(80,100,40,.2);
  border: 1px solid rgba(100,140,50,.3);
  border-radius: 4px; padding: 1px 6px;
}
.card-skill {
  font-size: 10px; color: #8a9aaa;
  text-align: center; line-height: 1.5;
  padding: 0 4px;
}

.full-warning {
  font-size: 13px; color: #c07070;
  background: rgba(80,20,20,.45);
  border: 1px solid rgba(160,60,60,.4);
  border-radius: 8px; padding: 8px 20px;
  width: calc(100% - 32px); max-width: 700px;
  text-align: center;
}

.card-disabled { opacity: .45; cursor: not-allowed; pointer-events: none; }
</style>
