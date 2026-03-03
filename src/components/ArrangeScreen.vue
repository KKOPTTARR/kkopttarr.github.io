<template>
  <!-- 上方面板（整理模式），flex:1 占半屏 -->
  <div class="upper-panel arrange-mode">
    <div class="panel-status">
      <div class="status-lives">
        <span v-for="i in maxLives" :key="i" class="heart-icon">{{ i <= lives ? '❤️' : '🖤' }}</span>
      </div>
      <div class="status-info">第 {{ battleCount + 1 }} 战 · {{ wins }}/5 ⭐</div>
      <div class="status-gold">💰 {{ gold }}</div>
    </div>
    <div class="panel-header">
      <div class="panel-header-spacer"></div>
      <span class="panel-title">⚔️ 整理阵容</span>
      <button class="go-battle-btn" @click="$emit('startBattle')">⚔️ 出发</button>
    </div>
    <div class="panel-body">
      <div v-if="!showBackpack" class="arrange-empty">
        <div class="arrange-hint">调整阵容后出发</div>
      </div>
      <div v-else class="backpack-view">
        <GridBoard
          :items="backpackItems" zone="backpack"
          :is-enemy="false" :is-battle="false"
          :compact="false" :cell-size="113" :cell-height="175"
        />
        <div v-if="backpackItems.length === 0" class="backpack-empty">空背包 · 可从阵容拖入</div>
      </div>
    </div>
  </div>

  <!-- 下方阵容区，flex:1 占半屏 -->
  <div class="formation-panel">
    <div class="formation-header">
      <span class="panel-label">— 我方阵容 —</span>
      <button class="backpack-toggle-btn" @click="$emit('update:showBackpack', !showBackpack)">
        {{ showBackpack ? '🗡️ 阵容' : '🎒 背包' }}
      </button>
    </div>
    <GridBoard
      :items="playerItems" zone="player"
      :is-enemy="false" :is-battle="false"
      :compact="false" :cell-size="113" :cell-height="175"
      :rows="1" :unlocked-cols="unlockedCols"
    />
    <div class="sell-zone" :class="{ 'drag-over-sell': dragState.overSellZone }">
      🗑️ 拖到此处出售 (+1金)
    </div>
  </div>
</template>

<script setup>
import GridBoard from './GridBoard.vue'
import { dragState } from '../composables/useDrag.js'

defineProps({
  lives:        Number,
  maxLives:     Number,
  battleCount:  Number,
  wins:         Number,
  gold:         Number,
  playerItems:  Array,
  backpackItems:Array,
  unlockedCols: Number,
  showBackpack: Boolean,
})

defineEmits(['update:showBackpack', 'startBattle'])
</script>

<style scoped>
/* ── 上方面板（占半屏）── */
.upper-panel {
  flex: 1; min-height: 0;
  background:
    linear-gradient(180deg,
      rgba(6,4,1,.0) 0%,
      rgba(6,4,1,.0) 40%,
      rgba(6,4,1,.15) 75%,
      rgba(6,4,1,.30) 100%),
    url('/background/bg-clear.png') center 35% / cover no-repeat;
  border-bottom: 2px solid rgba(140,80,20,.4);
  display: flex; flex-direction: column;
}
.upper-panel.arrange-mode {
  background:
    linear-gradient(180deg,
      rgba(6,4,1,.0) 0%,
      rgba(5,3,1,.0) 40%,
      rgba(5,3,1,.18) 72%,
      rgba(5,3,1,.35) 100%),
    url('/background/bg-clear.png') center 55% / cover no-repeat;
}
.panel-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 6px 10px;
  border-bottom: 1px solid rgba(140,80,20,.3);
  background: rgba(6,4,1,.78);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}
.panel-title { font-size: 12px; color: var(--text-dim); letter-spacing: 1px; }
.go-battle-btn {
  padding: 7px 14px; border-radius: 6px; font-size: 13px; font-weight: bold;
  cursor: pointer; font-family: inherit;
  background: linear-gradient(135deg, #7a1a08, #c0350a);
  color: #f0d9b5; border: 1px solid #c04010;
  box-shadow: 0 2px 6px rgba(150,50,10,.3);
  transition: filter .1s;
}
.go-battle-btn:hover { filter: brightness(1.12); }
.panel-body {
  flex: 1; min-height: 0;
  padding: 8px;
  display: flex; flex-direction: column;
  justify-content: center; align-items: center;
}
.panel-header-spacer { width: 36px; height: 36px; flex-shrink: 0; }

/* ── 内容区视图 ── */
.arrange-empty {
  display: flex; align-items: center; justify-content: center; flex: 1;
}
.arrange-hint {
  color: var(--text-dim); font-size: 13px; opacity: .6; letter-spacing: 1px;
}
.backpack-view {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  width: 100%;
}
.backpack-empty {
  color: var(--text-dim); font-size: 11px;
  padding: 12px; text-align: center; opacity: .7;
}

/* ── 下方阵容区（占半屏）── */
.formation-panel {
  flex: 1; min-height: 0;
  background:
    linear-gradient(180deg,
      rgba(5,3,1,.0)  0%,
      rgba(5,3,1,.0)  25%,
      rgba(5,3,1,.12) 60%,
      rgba(5,3,1,.35) 100%),
    url('/background/bg-clear.png') center 75% / cover no-repeat;
  padding: 8px 8px 12px;
  display: flex; flex-direction: column;
  align-items: center; justify-content: flex-start; gap: 6px;
}
.panel-label { font-size: 11px; color: var(--text-dim); letter-spacing: 2px; }
.formation-header {
  width: 100%;
  display: flex; justify-content: space-between; align-items: center;
  padding: 4px 6px;
  background: rgba(6,4,1,.72);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  border-radius: 8px;
}
.backpack-toggle-btn {
  font-size: 11px; padding: 3px 10px; border-radius: 10px;
  background: var(--panel); border: 1px solid var(--panel-border);
  color: var(--text-dim); cursor: pointer; font-family: inherit;
  transition: border-color .12s, color .12s;
}
.backpack-toggle-btn:hover { border-color: var(--gold); color: var(--gold); }
</style>
