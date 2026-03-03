<template>
  <div class="wreck-screen">
    <div class="panel-status">
      <div class="status-lives">
        <span v-for="i in maxLives" :key="i" class="heart-icon">{{ i <= lives ? '⚡' : '○' }}</span>
      </div>
      <div class="status-info">第 {{ battleCount + 1 }} 战 · {{ wins }}/5 ⭐</div>
      <div class="status-gold">💰 {{ gold }}</div>
    </div>
    <div class="wreck-header">
      <span class="wreck-title">⚓ 残骸搜寻</span>
      <button class="wreck-skip-btn" @click="$emit('skip')">跳过</button>
    </div>
    <div class="wreck-desc">从沉船残骸中打捞出宝物，选择一件带走</div>
    <div class="candidate-list">
      <div
        v-for="(item, i) in candidates"
        :key="i"
        class="candidate-row"
        @click="$emit('select', item)"
      >
        <img :src="getIconUrl(item.name_en, item.tier)" class="cand-img" draggable="false" />
        <div class="cand-body">
          <div class="cand-name-line">
            <span class="cand-name">{{ item.name_cn }}</span>
            <span class="cand-tier tier-text-Bronze">铜</span>
          </div>
          <div class="cand-tags">{{ (item.tags || []).join(' · ') }}</div>
          <div class="cand-skill">{{ item.skill_cn }}</div>
        </div>
        <div class="cand-arrow">›</div>
      </div>
      <div v-if="candidates.length === 0" class="cand-empty">残骸中没有找到合适的宝物</div>
    </div>
  </div>
</template>

<script setup>
import { getIconUrl } from '../data/items.js'

defineProps({
  candidates:  { type: Array,  default: () => [] },
  lives:       Number,
  maxLives:    Number,
  battleCount: Number,
  wins:        Number,
  gold:        Number,
})

defineEmits(['select', 'skip'])
</script>

<style scoped>
.wreck-screen {
  flex: 1; display: flex; flex-direction: column;
  background:
    linear-gradient(rgba(2,8,16,.90), rgba(2,8,16,.90)),
    url('/background/bg-sea-chart.png') center / cover no-repeat;
}
.wreck-header {
  flex-shrink: 0; display: flex; justify-content: space-between; align-items: center;
  padding: 14px 14px 10px;
  border-bottom: 1px solid var(--panel-border);
}
.wreck-title { font-size: 16px; font-weight: bold; color: var(--gold); }
.wreck-skip-btn {
  padding: 6px 14px; border-radius: 6px; font-size: 12px;
  background: var(--panel); border: 1px solid var(--panel-border);
  color: var(--text-dim); cursor: pointer; font-family: inherit;
}
.wreck-skip-btn:hover { border-color: var(--gold); color: var(--gold); }
.wreck-desc {
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
.candidate-row:hover {
  border-color: var(--bronze); background: rgba(150,90,20,.10);
}
.cand-img { width: 44px; height: 44px; border-radius: 8px; object-fit: cover; flex-shrink: 0; }
.cand-body { flex: 1; display: flex; flex-direction: column; gap: 3px; }
.cand-name-line { display: flex; align-items: center; gap: 6px; }
.cand-name { font-size: 13px; font-weight: bold; color: var(--text); }
.cand-tier { font-size: 11px; font-weight: bold; }
.cand-tags { font-size: 11px; color: var(--text-dim); opacity: .8; }
.cand-skill { font-size: 11px; color: var(--text-dim); line-height: 1.4; }
.cand-arrow { font-size: 20px; color: var(--text-dim); flex-shrink: 0; }
.cand-empty { color: var(--text-dim); font-size: 13px; text-align: center; padding: 32px 0; opacity: .6; }
.tier-text-Bronze { color: var(--bronze); }
</style>
