<template>
  <div class="upgrade-screen">
    <div class="panel-status">
      <div class="status-lives">
        <span v-for="i in maxLives" :key="i" class="heart-icon">{{ i <= lives ? '❤️' : '🖤' }}</span>
      </div>
      <div class="status-info">第 {{ battleCount + 1 }} 战 · {{ wins }}/5 ⭐</div>
      <div class="status-gold">💰 {{ gold }}</div>
    </div>
    <div class="upgrade-header">
      <span class="upgrade-title">🔀 选择送出的物品</span>
      <button class="upgrade-skip-btn" @click="$emit('skip')">跳过</button>
    </div>
    <div class="upgrade-list">
      <div
        v-for="item in items"
        :key="item.instanceId"
        class="upgrade-item-row"
        @click="$emit('confirm', item)"
      >
        <img :src="getIconUrl(item.name_en, item.tier)" class="upgrade-item-img" draggable="false" />
        <div class="upgrade-item-body">
          <div class="upgrade-item-name">{{ item.name_cn }}</div>
          <div class="upgrade-tier-line">
            <span :class="`tier-text-${item.tier}`">{{ appTierLabel(item.tier) }}</span>
            <span class="upgrade-arrow"> → 随机同品质物品</span>
          </div>
        </div>
      </div>
      <div v-if="items.length === 0" class="upgrade-empty">
        暂无可交换的物品
      </div>
    </div>
  </div>
</template>

<script setup>
import { getIconUrl } from '../data/items.js'

defineProps({
  items:      { type: Array,  default: () => [] },
  lives:      Number,
  maxLives:   Number,
  battleCount:Number,
  wins:       Number,
  gold:       Number,
})

defineEmits(['confirm', 'skip'])

function appTierLabel(t) {
  return { Bronze: '铜', Silver: '⭐银', Gold: '⭐⭐金', Diamond: '⭐⭐⭐钻' }[t] || t
}
</script>

<style scoped>
.upgrade-screen {
  flex: 1; display: flex; flex-direction: column;
  background:
    linear-gradient(rgba(4,8,18,.88), rgba(4,8,18,.88)),
    url('/background/bg-sea-chart.png') center / cover no-repeat;
}
.upgrade-header {
  flex-shrink: 0; display: flex; justify-content: space-between; align-items: center;
  padding: 14px 14px 10px;
  border-bottom: 1px solid var(--panel-border);
}
.upgrade-title { font-size: 16px; font-weight: bold; color: var(--gold); }
.upgrade-skip-btn {
  padding: 6px 14px; border-radius: 6px; font-size: 12px;
  background: var(--panel); border: 1px solid var(--panel-border);
  color: var(--text-dim); cursor: pointer; font-family: inherit;
}
.upgrade-skip-btn:hover { border-color: var(--gold); color: var(--gold); }
.upgrade-list {
  flex: 1; overflow-y: auto; padding: 10px 12px;
  display: flex; flex-direction: column; gap: 8px;
}
.upgrade-item-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: 10px; cursor: pointer;
  background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08);
  transition: border-color .14s, background .14s;
}
.upgrade-item-row:hover {
  border-color: var(--gold); background: rgba(200,134,10,.08);
}
.upgrade-item-img { width: 44px; height: 44px; border-radius: 8px; object-fit: cover; flex-shrink: 0; }
.upgrade-item-body { flex: 1; display: flex; flex-direction: column; gap: 3px; }
.upgrade-item-name { font-size: 13px; font-weight: bold; color: var(--text); }
.upgrade-tier-line { font-size: 11px; display: flex; align-items: center; gap: 3px; }
.upgrade-arrow { color: var(--text-dim); }
.upgrade-empty { color: var(--text-dim); font-size: 13px; text-align: center; padding: 32px 0; opacity: .6; }
.tier-text-Bronze  { color: var(--bronze); }
.tier-text-Silver  { color: var(--silver); }
.tier-text-Gold    { color: var(--gold);   }
.tier-text-Diamond { color: var(--gem);    }
</style>
