<template>
  <div class="upgrade-screen">
    <div class="panel-status">
      <div class="status-lives">
        <span v-for="i in maxLives" :key="i" class="heart-icon">{{ i <= lives ? '⚡' : '○' }}</span>
      </div>
      <div class="status-info">第 {{ battleCount + 1 }} 战 · {{ wins }}/5 ⭐</div>
      <div class="status-gold">💰 {{ gold }}</div>
    </div>
    <div class="upgrade-header">
      <span class="upgrade-title">{{ step === 1 ? '⚒️ 选择第一件物品' : '⚒️ 选择第二件物品' }}</span>
      <button class="upgrade-skip-btn" @click="onSkip">{{ step === 1 ? '跳过' : '返回' }}</button>
    </div>

    <div v-if="step === 2" class="forge-hint">
      与
      <span :class="`tier-text-${selected.tier}`">{{ tierLabel(selected.tier) }}</span>
      <strong>{{ selected.name_cn }}</strong>
      锻造 →
      <span :class="`tier-text-${nextTier}`">{{ tierLabel(nextTier) }}</span>
      随机物品
    </div>

    <div class="upgrade-list">
      <div
        v-for="item in displayItems"
        :key="item.instanceId"
        class="upgrade-item-row"
        :class="{ 'is-selected': selected?.instanceId === item.instanceId }"
        @click="onSelect(item)"
      >
        <img :src="getIconUrl(item.name_en, item.tier)" class="upgrade-item-img" draggable="false" />
        <div class="upgrade-item-body">
          <div class="upgrade-item-name">{{ item.name_cn }}</div>
          <div class="upgrade-tier-line">
            <span :class="`tier-text-${item.tier}`">{{ tierLabel(item.tier) }}</span>
          </div>
        </div>
      </div>
      <div v-if="displayItems.length === 0" class="upgrade-empty">
        {{ step === 1 ? '没有可锻造的物品' : '没有同品质的第二件物品' }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { getIconUrl } from '../data/items.js'

const props = defineProps({
  items:       { type: Array, default: () => [] },
  lives:       Number,
  maxLives:    Number,
  battleCount: Number,
  wins:        Number,
  gold:        Number,
})
const emit = defineEmits(['forge', 'skip'])

const TIER_ORDER = ['Bronze', 'Silver', 'Gold', 'Diamond']
const TIER_LABELS = { Bronze: '铜', Silver: '⭐银', Gold: '⭐⭐金', Diamond: '⭐⭐⭐钻' }

const step     = ref(1)
const selected = ref(null)

const displayItems = computed(() => {
  if (step.value === 1) return props.items.filter(i => i.tier !== 'Diamond')
  return props.items.filter(i =>
    i.tier === selected.value?.tier && i.instanceId !== selected.value?.instanceId
  )
})

const nextTier = computed(() => {
  if (!selected.value) return ''
  return TIER_ORDER[TIER_ORDER.indexOf(selected.value.tier) + 1] ?? selected.value.tier
})

function tierLabel(t) { return TIER_LABELS[t] || t }

function onSelect(item) {
  if (step.value === 1) {
    selected.value = item
    step.value = 2
    return
  }
  emit('forge', selected.value, item)
}

function onSkip() {
  if (step.value === 2) {
    step.value = 1
    selected.value = null
    return
  }
  emit('skip')
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
.forge-hint {
  padding: 8px 14px; font-size: 12px; color: var(--text-dim);
  background: rgba(255,255,255,.03); border-bottom: 1px solid var(--panel-border);
}
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
.upgrade-item-row:hover     { border-color: var(--gold); background: rgba(200,134,10,.08); }
.upgrade-item-row.is-selected { border-color: var(--gold); background: rgba(200,134,10,.14); }
.upgrade-item-img  { width: 44px; height: 44px; border-radius: 8px; object-fit: cover; flex-shrink: 0; }
.upgrade-item-body { flex: 1; display: flex; flex-direction: column; gap: 3px; }
.upgrade-item-name { font-size: 13px; font-weight: bold; color: var(--text); }
.upgrade-tier-line { font-size: 11px; }
.upgrade-empty     { color: var(--text-dim); font-size: 13px; text-align: center; padding: 32px 0; opacity: .6; }
.tier-text-Bronze  { color: var(--bronze); }
.tier-text-Silver  { color: var(--silver); }
.tier-text-Gold    { color: var(--gold);   }
.tier-text-Diamond { color: var(--gem);    }
</style>
