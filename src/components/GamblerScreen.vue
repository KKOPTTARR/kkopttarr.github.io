<template>
  <div class="upgrade-screen">
    <div class="panel-status">
      <div class="status-lives">
        <span v-for="i in maxLives" :key="i" class="heart-icon">{{ i <= lives ? '⚡' : '○' }}</span>
      </div>
      <div class="status-info">第 {{ battleCount + 1 }} 战 · {{ wins }}/{{ GC.WINS_TO_CLEAR }} ⭐</div>
      <div class="status-gold">💰 {{ gold }}</div>
    </div>
    <div class="upgrade-header">
      <span class="upgrade-title">🎲 赌徒的骰子</span>
      <button class="upgrade-skip-btn" @click="$emit('skip')">跳过</button>
    </div>
    <div class="gambler-desc">选一件物品押注——50% 升品质，50% 降品质（铜质物品失败则消失）</div>
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
            <span class="lose-side" :class="`tier-text-${prevTier(item.tier)}`">
              {{ item.tier === 'Bronze' ? '💀 消失' : `↓ ${tierLabel(prevTier(item.tier))}质` }}
            </span>
            <span class="gambler-vs">50/50</span>
            <span class="win-side" :class="item.tier === 'Diamond' ? 'tier-text-Diamond' : `tier-text-${nextTier(item.tier)}`">
              {{ item.tier === 'Diamond' ? '★ 无变化' : `↑ ${tierLabel(nextTier(item.tier))}质` }}
            </span>
          </div>
        </div>
        <span class="gambler-icon">🎲</span>
      </div>
      <div v-if="items.length === 0" class="upgrade-empty">没有可押注的物品</div>
    </div>
  </div>
</template>

<script setup>
import GC from '../../config/gameConfig.json'
import { getIconUrl } from '../data/items.js'

const TIER_ORDER = ['Bronze', 'Silver', 'Gold', 'Diamond']
const TIER_LABELS = { Bronze: '铜', Silver: '银', Gold: '金', Diamond: '钻' }

defineProps({
  items:       { type: Array,  default: () => [] },
  lives:       Number,
  maxLives:    Number,
  battleCount: Number,
  wins:        Number,
  gold:        Number,
})

defineEmits(['confirm', 'skip'])

function nextTier(tier) {
  return TIER_ORDER[TIER_ORDER.indexOf(tier) + 1] ?? tier
}
function prevTier(tier) {
  return TIER_ORDER[TIER_ORDER.indexOf(tier) - 1] ?? tier
}
function tierLabel(t) {
  return TIER_LABELS[t] ?? t
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
.upgrade-title { font-size: 16px; font-weight: bold; color: #f0c040; }
.upgrade-skip-btn {
  padding: 6px 14px; border-radius: 6px; font-size: 12px;
  background: var(--panel); border: 1px solid var(--panel-border);
  color: var(--text-dim); cursor: pointer; font-family: inherit;
}
.upgrade-skip-btn:hover { border-color: #f0c040; color: #f0c040; }
.gambler-desc {
  padding: 8px 14px; font-size: 12px; color: var(--text-dim);
  border-bottom: 1px solid var(--panel-border);
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
.upgrade-item-row:hover { border-color: #f0c040; background: rgba(240,192,40,.08); }
.upgrade-item-img { width: 44px; height: 44px; border-radius: 8px; object-fit: cover; flex-shrink: 0; }
.upgrade-item-body { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.upgrade-item-name { font-size: 13px; font-weight: bold; color: var(--text); }
.upgrade-tier-line {
  display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: bold;
}
.gambler-vs { color: var(--text-dim); font-size: 10px; opacity: .7; }
.lose-side { color: #e05040; }
.win-side  { color: #50e080; }
.gambler-icon { font-size: 20px; flex-shrink: 0; }
.upgrade-empty { color: var(--text-dim); font-size: 13px; text-align: center; padding: 32px 0; opacity: .6; }
.tier-text-Bronze  { color: var(--bronze); }
.tier-text-Silver  { color: var(--silver); }
.tier-text-Gold    { color: var(--gold);   }
.tier-text-Diamond { color: var(--gem);    }
</style>
