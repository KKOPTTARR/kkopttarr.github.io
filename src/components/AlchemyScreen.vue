<template>
  <div class="alchemy-screen">
    <div class="panel-status">
      <div class="status-lives">
        <span v-for="i in maxLives" :key="i" class="heart-icon">{{ i <= lives ? '⚡' : '○' }}</span>
      </div>
      <div class="status-info">第 {{ battleCount + 1 }} 战 · {{ wins }}/5 ⭐</div>
      <div class="status-gold">💰 {{ gold }}</div>
    </div>
    <div class="alchemy-header">
      <span class="alchemy-title">⚗️ 炼金</span>
      <button class="alchemy-skip-btn" @click="$emit('skip')">跳过</button>
    </div>
    <div class="alchemy-desc">
      选择 3 件铜质物品销毁，炼制一件随机金质宝物
      <span class="select-count" :class="{ full: selected.length === 3 }">
        已选 {{ selected.length }}/3
      </span>
    </div>
    <div class="item-list">
      <div
        v-for="item in items"
        :key="item.instanceId"
        class="item-row"
        :class="{ selected: isSelected(item), disabled: selected.length >= 3 && !isSelected(item) }"
        @click="toggleSelect(item)"
      >
        <div class="select-indicator">{{ isSelected(item) ? '✓' : '' }}</div>
        <img :src="getIconUrl(item.name_en, item.tier)" class="item-img" draggable="false" />
        <div class="item-body">
          <div class="item-name-line">
            <span class="item-name">{{ item.name_cn }}</span>
            <span class="item-tier tier-text-Bronze">铜</span>
          </div>
          <div class="item-tags">{{ (item.tags || []).join(' · ') }}</div>
        </div>
      </div>
      <div v-if="items.length === 0" class="item-empty">没有足够的铜质物品</div>
    </div>
    <div class="alchemy-footer">
      <button
        class="btn btn-primary confirm-btn"
        :disabled="selected.length < 3"
        @click="onConfirm"
      >
        {{ selected.length < 3 ? `还需选 ${3 - selected.length} 件` : '⚗️ 开始炼金' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { getIconUrl } from '../data/items.js'

defineProps({
  items:       { type: Array,  default: () => [] },
  lives:       Number,
  maxLives:    Number,
  battleCount: Number,
  wins:        Number,
  gold:        Number,
})

const emit = defineEmits(['confirm', 'skip'])

const selected = ref([])

function isSelected(item) {
  return selected.value.some(s => s.instanceId === item.instanceId)
}

function toggleSelect(item) {
  if (isSelected(item)) {
    selected.value = selected.value.filter(s => s.instanceId !== item.instanceId)
  } else if (selected.value.length < 3) {
    selected.value = [...selected.value, item]
  }
}

function onConfirm() {
  if (selected.value.length < 3) return
  emit('confirm', [...selected.value])
}
</script>

<style scoped>
.alchemy-screen {
  flex: 1; display: flex; flex-direction: column;
  background:
    linear-gradient(rgba(8,4,16,.92), rgba(8,4,16,.92)),
    url('/background/bg-sea-chart.png') center / cover no-repeat;
}
.alchemy-header {
  flex-shrink: 0; display: flex; justify-content: space-between; align-items: center;
  padding: 14px 14px 10px;
  border-bottom: 1px solid var(--panel-border);
}
.alchemy-title { font-size: 16px; font-weight: bold; color: #c080ff; }
.alchemy-skip-btn {
  padding: 6px 14px; border-radius: 6px; font-size: 12px;
  background: var(--panel); border: 1px solid var(--panel-border);
  color: var(--text-dim); cursor: pointer; font-family: inherit;
}
.alchemy-skip-btn:hover { border-color: #c080ff; color: #c080ff; }
.alchemy-desc {
  padding: 8px 14px; font-size: 12px; color: var(--text-dim);
  border-bottom: 1px solid var(--panel-border);
  display: flex; justify-content: space-between; align-items: center;
}
.select-count { font-size: 12px; font-weight: bold; color: var(--text-dim); }
.select-count.full { color: #c080ff; }
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
.item-row:hover:not(.disabled) { border-color: #c080ff; background: rgba(160,60,255,.08); }
.item-row.selected { border-color: #c080ff; background: rgba(160,60,255,.14); }
.item-row.disabled { opacity: .35; cursor: not-allowed; }
.select-indicator {
  width: 20px; height: 20px; border-radius: 50%; flex-shrink: 0;
  border: 1.5px solid rgba(255,255,255,.2);
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: bold; color: #c080ff;
}
.item-row.selected .select-indicator { background: #c080ff; border-color: #c080ff; color: #fff; }
.item-img { width: 44px; height: 44px; border-radius: 8px; object-fit: cover; flex-shrink: 0; }
.item-body { flex: 1; display: flex; flex-direction: column; gap: 3px; }
.item-name-line { display: flex; align-items: center; gap: 6px; }
.item-name { font-size: 13px; font-weight: bold; color: var(--text); }
.item-tier { font-size: 11px; font-weight: bold; }
.item-tags { font-size: 11px; color: var(--text-dim); opacity: .8; }
.item-empty { color: var(--text-dim); font-size: 13px; text-align: center; padding: 32px 0; opacity: .6; }
.alchemy-footer {
  flex-shrink: 0; padding: 10px 14px;
  border-top: 1px solid var(--panel-border);
  background: var(--panel);
}
.confirm-btn { width: 100%; padding: 12px; font-size: 14px; }
.confirm-btn:disabled { opacity: .45; cursor: not-allowed; filter: none; }
.tier-text-Bronze { color: var(--bronze); }
</style>
