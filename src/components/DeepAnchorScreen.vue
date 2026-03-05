<template>
  <div class="deep-anchor-screen">
    <PanelStatus :lives="lives" :max-lives="maxLives" :battle-count="battleCount" />
    <div class="da-header">
      <span class="da-title">🪝 深锚强化</span>
      <button class="da-skip-btn" @click="$emit('skip')">跳过</button>
    </div>
    <div class="da-desc">选一件道具，随机赋予一种永久特效</div>
    <div class="candidate-list">
      <div
        v-for="item in items"
        :key="item.instanceId"
        class="candidate-row"
        :class="{ selected: selected?.instanceId === item.instanceId }"
        @click="selected = item"
      >
        <img :src="getIconUrl(item.name_en, item.tier)" class="cand-img" draggable="false" />
        <div class="cand-body">
          <div class="cand-name-line">
            <span class="cand-name">{{ item.name_cn }}</span>
            <span class="cand-tier" :class="`tier-text-${item.tier}`">{{ TIER_LABELS[item.tier] }}</span>
          </div>
          <div class="cand-bonus">{{ getBonusDesc() }}</div>
        </div>
        <div class="cand-check">{{ selected?.instanceId === item.instanceId ? '✓' : '' }}</div>
      </div>
      <div v-if="items.length === 0" class="cand-empty">没有可强化的道具</div>
    </div>
    <div class="da-footer">
      <button class="btn btn-primary confirm-btn" :disabled="!selected" @click="$emit('confirm', selected)">
        确认强化
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { getIconUrl } from '../data/items.js'
import { TIER_LABELS } from '../data/tiers.js'
import { SPECIAL_EFFECTS } from '../data/specialEffects.js'
import PanelStatus from './PanelStatus.vue'

defineProps({
  items:       { type: Array, default: () => [] },
  lives:       Number,
  maxLives:    Number,
  battleCount: Number,
})

defineEmits(['confirm', 'skip'])

const selected = ref(null)

const effectLabels = SPECIAL_EFFECTS.map(e => e.label).join(' / ')

function getBonusDesc() {
  return `随机获得：${effectLabels}`
}
</script>

<style scoped>
.deep-anchor-screen {
  position: fixed; top: 0; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 600px; z-index: 200;
  display: flex; flex-direction: column;
  background:
    linear-gradient(rgba(4,10,20,.72), rgba(4,10,20,.72)),
    url('/background/bg-sea-chart.png') center / cover no-repeat;
}
.da-header {
  flex-shrink: 0; display: flex; justify-content: space-between; align-items: center;
  padding: 14px 14px 10px;
  border-bottom: 1px solid var(--panel-border);
}
.da-title { font-size: 16px; font-weight: bold; color: var(--gold); }
.da-skip-btn {
  padding: 6px 14px; border-radius: 6px; font-size: 12px;
  background: var(--panel); border: 1px solid var(--panel-border);
  color: var(--text-dim); cursor: pointer; font-family: inherit;
}
.da-skip-btn:hover { border-color: var(--gold); color: var(--gold); }
.da-desc {
  padding: 8px 14px; font-size: 12px; color: var(--text-dim);
  border-bottom: 1px solid var(--panel-border);
}
.candidate-list {
  flex: 1; overflow-y: auto; padding: 10px 12px;
  display: flex; flex-direction: column; gap: 8px;
}
.candidate-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: 10px; cursor: pointer;
  background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08);
  transition: border-color .14s, background .14s;
}
.candidate-row:hover    { border-color: var(--gold); background: rgba(200,134,10,.08); }
.candidate-row.selected { border-color: var(--gold); background: rgba(200,134,10,.13); }
.cand-img   { width: 44px; height: 44px; border-radius: 8px; object-fit: cover; flex-shrink: 0; }
.cand-body  { flex: 1; display: flex; flex-direction: column; gap: 3px; }
.cand-name-line { display: flex; align-items: center; gap: 6px; }
.cand-name  { font-size: 13px; font-weight: bold; color: var(--text); }
.cand-tier  { font-size: 11px; font-weight: bold; }
.cand-bonus { font-size: 11px; color: #80d090; line-height: 1.4; }
.cand-check { font-size: 18px; color: var(--gold); width: 20px; text-align: center; flex-shrink: 0; }
.cand-empty { color: var(--text-dim); font-size: 13px; text-align: center; padding: 32px 0; opacity: .6; }
.da-footer {
  flex-shrink: 0; padding: 10px 14px;
  border-top: 1px solid var(--panel-border);
  background: var(--panel);
}
.confirm-btn { width: 100%; padding: 12px; font-size: 15px; }
.tier-text-Bronze  { color: var(--bronze); }
.tier-text-Silver  { color: var(--silver); }
.tier-text-Gold    { color: var(--gold);   }
.tier-text-Diamond { color: var(--gem);    }
</style>
