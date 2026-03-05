<template>
  <div class="shop-event-screen">

    <PanelStatus :lives="lives" :max-lives="maxLives" :battle-count="battleCount" />

    <!-- 标题区 -->
    <div class="select-header">
      <div class="select-title">🏪 宝藏商店</div>
      <div class="select-sub">随机出现三件宝物，选择一件带走</div>
      <div class="header-actions">
        <button class="reroll-btn" :disabled="rerolled" @click="onReroll">
          {{ rerolled ? '已刷新' : '🔄 刷新' }}
        </button>
        <button class="skip-btn" @click="$emit('skip')">跳过</button>
      </div>
    </div>

    <!-- 背包满提示 -->
    <div v-if="inventoryFull" class="full-warning">🎒 背包已满，请先丢弃物品</div>

    <!-- 三列竖卡片 -->
    <div class="select-cards">
      <div
        v-for="(item, i) in candidates"
        :key="i"
        class="item-card"
        :class="[`card-${item.tier.toLowerCase()}`, { 'card-disabled': inventoryFull }]"
        @click="inventoryFull ? null : $emit('select', item)"
      >
        <img :src="getIconUrl(item.name_en, item.tier)" class="card-portrait" draggable="false" />

        <div class="card-tier" :class="`tier-${item.tier.toLowerCase()}`">
          {{ TIER_LABELS[item.tier] }}
        </div>

        <div class="card-name" :class="`name-${item.tier.toLowerCase()}`">{{ item.name_cn }}</div>

        <div v-if="item.tags?.length" class="card-tags">
          <span v-for="tag in item.tags" :key="tag" class="tag-chip">{{ tag }}</span>
        </div>

        <div class="card-skill" v-html="parseSkill(item.skill_cn)" />
      </div>
      <div v-if="candidates.length === 0" class="empty-hint">商店暂时没有宝物</div>
    </div>

  </div>
</template>

<script setup>
import { ref } from 'vue'
import { getIconUrl } from '../data/items.js'
import { TIER_LABELS } from '../data/tiers.js'
import { parseSkill } from '../utils.js'
import PanelStatus from './PanelStatus.vue'

defineProps({
  candidates:    { type: Array,   default: () => [] },
  lives:         Number,
  maxLives:      Number,
  battleCount:   Number,
  inventoryFull: { type: Boolean, default: false },
})

const emit = defineEmits(['select', 'reroll', 'skip'])

const rerolled = ref(false)
function onReroll() {
  rerolled.value = true
  emit('reroll')
}
</script>

<style scoped>
.shop-event-screen {
  position: fixed; top: 0; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 600px; z-index: 200;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background:
    linear-gradient(180deg,
      rgba(0,0,0,.72) 0%,
      rgba(0,0,0,.38) 18%,
      rgba(0,0,0,.32) 80%,
      rgba(0,0,0,.65) 100%),
    url('/background/bg-treasure-map.png') center 40% / cover no-repeat;
  gap: 16px;
}

/* ── 标题区 ── */
.select-header {
  text-align: center;
  display: flex; flex-direction: column; gap: 8px;
  background: rgba(6,4,1,.70);
  backdrop-filter: blur(8px);
  padding: 12px 24px; border-radius: 12px;
  border: 1px solid rgba(180,100,30,.25);
  width: calc(100% - 32px); max-width: 700px;
}
.select-title {
  font-size: 26px; font-weight: 700;
  color: #e8c87a;
  text-shadow: 0 0 12px rgba(220,160,60,.5);
  letter-spacing: 1px;
}
.select-sub { font-size: 13px; color: #9e8060; }

.header-actions {
  display: flex; justify-content: center; gap: 10px; margin-top: 2px;
}
.reroll-btn, .skip-btn {
  padding: 5px 16px; border-radius: 6px; font-size: 12px;
  cursor: pointer; font-family: inherit;
  border: 1px solid rgba(180,100,30,.35);
  background: rgba(255,255,255,.06);
  color: #9e8060;
  transition: border-color .14s, color .14s;
}
.reroll-btn:hover:not(:disabled), .skip-btn:hover {
  border-color: #c8860a; color: #e8c87a;
}
.reroll-btn:disabled { opacity: .4; cursor: not-allowed; }

/* ── 卡片组 ── */
.select-cards {
  display: flex; gap: 12px;
  width: calc(100% - 32px); max-width: 700px;
  align-items: stretch;
  height: 320px;
}

/* ── 单张卡片 ── */
.item-card {
  position: relative;
  flex: 1;
  display: flex; flex-direction: column; align-items: center;
  gap: 8px;
  padding: 10px 8px 14px;
  overflow: hidden;
  background: linear-gradient(160deg, rgba(46,26,8,.82), rgba(30,16,8,.88));
  border: 1px solid rgba(160,90,30,.55);
  border-radius: 14px;
  cursor: pointer;
  backdrop-filter: blur(4px);
  box-shadow: 0 4px 16px rgba(0,0,0,.5), inset 0 1px 0 rgba(200,130,40,.10);
  transition: transform .15s, border-color .15s, box-shadow .15s;
  text-align: center;
}
.item-card:hover  { transform: translateY(-4px); }
.item-card:active { transform: translateY(0); }

.card-bronze:hover  { border-color: #c8860a; box-shadow: 0 8px 24px rgba(180,110,20,.35); }
.card-silver:hover  { border-color: #aaaacc; box-shadow: 0 8px 24px rgba(140,140,200,.35); }
.card-gold:hover    { border-color: #d4a820; box-shadow: 0 8px 24px rgba(200,160,20,.4); }
.card-diamond:hover { border-color: #60d0ff; box-shadow: 0 8px 24px rgba(60,180,255,.4); }

/* ── 立绘 ── */
.card-portrait {
  width: 90px; height: 90px;
  border-radius: 10px; object-fit: cover;
  margin-bottom: 2px;
}

/* ── 品质标签 ── */
.card-tier {
  font-size: 11px; font-weight: bold;
  padding: 2px 10px; border-radius: 10px;
  letter-spacing: .5px;
}
.tier-bronze  { background: rgba(180,110,20,.2);  color: var(--bronze); border: 1px solid rgba(180,110,20,.5); }
.tier-silver  { background: rgba(160,160,200,.15); color: var(--silver); border: 1px solid rgba(160,160,200,.4); }
.tier-gold    { background: rgba(212,168,32,.2);  color: var(--gold);   border: 1px solid rgba(212,168,32,.5); }
.tier-diamond { background: rgba(60,180,255,.15); color: var(--gem);    border: 1px solid rgba(60,180,255,.4); }

/* ── 名称 ── */
.card-name {
  font-size: 14px; font-weight: 700; line-height: 1.3;
}
.name-bronze  { color: var(--bronze); }
.name-silver  { color: var(--silver); }
.name-gold    { color: var(--gold);   }
.name-diamond { color: var(--gem);    }

/* ── 标签 ── */
.card-tags {
  display: flex; flex-wrap: wrap; gap: 3px; justify-content: center;
}
.tag-chip {
  font-size: 9px; color: #8aaa68;
  background: rgba(80,100,40,.2);
  border: 1px solid rgba(100,140,50,.3);
  border-radius: 4px; padding: 1px 6px;
}

/* ── 技能 ── */
.card-skill {
  font-size: 10px; color: #8a9aaa;
  text-align: center; line-height: 1.5;
  padding: 0 4px;
}

.empty-hint { color: #5a4a30; font-size: 13px; text-align: center; padding: 40px; }

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
