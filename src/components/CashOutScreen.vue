<template>
  <div class="cashout-screen">
    <div class="panel-status">
      <div class="status-lives">
        <span v-for="i in maxLives" :key="i" class="heart-icon">{{ i <= lives ? '⚡' : '○' }}</span>
      </div>
      <div class="status-info">第 {{ battleCount + 1 }} 战 · {{ wins }}/5 ⭐</div>
      <div class="status-gold">💰 {{ gold }}</div>
    </div>
    <div class="cashout-header">
      <span class="cashout-title">💰 变现</span>
      <button class="cashout-skip-btn" @click="$emit('skip')">跳过</button>
    </div>
    <div class="cashout-desc">选择一件物品出售，获得溢价金币</div>
    <div class="item-list">
      <div
        v-for="item in items"
        :key="item.instanceId"
        class="item-row"
        @click="$emit('confirm', item)"
      >
        <img :src="getIconUrl(item.name_en, item.tier)" class="item-img" draggable="false" />
        <div class="item-body">
          <div class="item-name-line">
            <span class="item-name">{{ item.name_cn }}</span>
            <span class="item-tier" :class="`tier-text-${item.tier}`">{{ tierLabel(item.tier) }}</span>
          </div>
          <div class="item-tags">{{ (item.tags || []).join(' · ') }}</div>
        </div>
        <div class="item-price">
          <span class="price-normal">原价 💰1</span>
          <span class="price-cashout">💰 {{ cashOutPrice(item.tier) }}</span>
        </div>
      </div>
      <div v-if="items.length === 0" class="item-empty">没有可出售的物品</div>
    </div>
  </div>
</template>

<script setup>
import { getIconUrl } from '../data/items.js'
import GC from '../../config/gameConfig.json'

defineProps({
  items:       { type: Array,  default: () => [] },
  lives:       Number,
  maxLives:    Number,
  battleCount: Number,
  wins:        Number,
  gold:        Number,
})

defineEmits(['confirm', 'skip'])

function cashOutPrice(tier) {
  return GC.CASH_OUT_PRICE[tier] ?? 1
}

function tierLabel(t) {
  return { Bronze: '铜', Silver: '银', Gold: '金', Diamond: '钻' }[t] || t
}
</script>

<style scoped>
.cashout-screen {
  flex: 1; display: flex; flex-direction: column;
  background:
    linear-gradient(rgba(4,10,4,.90), rgba(4,10,4,.90)),
    url('/background/bg-sea-chart.png') center / cover no-repeat;
}
.cashout-header {
  flex-shrink: 0; display: flex; justify-content: space-between; align-items: center;
  padding: 14px 14px 10px;
  border-bottom: 1px solid var(--panel-border);
}
.cashout-title { font-size: 16px; font-weight: bold; color: var(--gold); }
.cashout-skip-btn {
  padding: 6px 14px; border-radius: 6px; font-size: 12px;
  background: var(--panel); border: 1px solid var(--panel-border);
  color: var(--text-dim); cursor: pointer; font-family: inherit;
}
.cashout-skip-btn:hover { border-color: var(--gold); color: var(--gold); }
.cashout-desc {
  padding: 8px 14px; font-size: 12px; color: var(--text-dim);
  border-bottom: 1px solid var(--panel-border);
}
.item-list {
  flex: 1; overflow-y: auto; padding: 10px 12px;
  display: flex; flex-direction: column; gap: 8px;
}
.item-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: 10px; cursor: pointer;
  background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08);
  transition: border-color .14s, background .14s;
}
.item-row:hover {
  border-color: var(--gold); background: rgba(200,134,10,.08);
}
.item-img { width: 44px; height: 44px; border-radius: 8px; object-fit: cover; flex-shrink: 0; }
.item-body { flex: 1; display: flex; flex-direction: column; gap: 3px; }
.item-name-line { display: flex; align-items: center; gap: 6px; }
.item-name { font-size: 13px; font-weight: bold; color: var(--text); }
.item-tier { font-size: 11px; font-weight: bold; }
.item-tags { font-size: 11px; color: var(--text-dim); opacity: .8; }
.item-price { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex-shrink: 0; }
.price-normal { font-size: 10px; color: var(--text-dim); text-decoration: line-through; opacity: .5; }
.price-cashout { font-size: 15px; font-weight: bold; color: var(--gold); }
.item-empty { color: var(--text-dim); font-size: 13px; text-align: center; padding: 32px 0; opacity: .6; }
.tier-text-Bronze  { color: var(--bronze); }
.tier-text-Silver  { color: var(--silver); }
.tier-text-Gold    { color: var(--gold);   }
.tier-text-Diamond { color: var(--gem);    }
</style>
