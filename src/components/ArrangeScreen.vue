<template>
<div class="arrange-screen">
  <!-- 状态栏 + 标题 -->
  <div class="arrange-header">
    <PanelStatus :lives="lives" :max-lives="maxLives" :battle-count="battleCount" />
    <div class="arrange-title-row">
      <span class="panel-title">⚔️ 整理阵容</span>
      <button v-if="hasPendingEvents" class="go-battle-btn continue-btn" @click="$emit('continue')">继续 →</button>
      <button v-else-if="isBossNext" class="go-battle-btn boss-btn" @click="$emit('startBattle')">💀 迎战 BOSS</button>
      <button v-else class="go-battle-btn" @click="$emit('startBattle')">⚔️ 出发</button>
    </div>
  </div>

  <!-- 背包 + 阵容整体下移 -->
  <div class="sell-zone" :class="{ 'drag-over-sell': dragState.overSellZone }">
    🗑️ 拖到此处丢弃
  </div>

  <div class="bottom-content">
    <div class="backpack-section">
      <div class="section-label">— 背包 —</div>
      <GridBoard
        :items="backpackItems" zone="backpack"
        :is-enemy="false" :is-battle="false"
        :compact="false" :cell-size="cellSize"
        :rows="BP_ROWS" :unlocked-cols="BP_COLS"
      />
      <div v-if="backpackItems.length === 0" class="backpack-empty">空背包 · 可从阵容拖入</div>
    </div>

    <div class="formation-section">
      <div class="section-label">— 我方阵容 —</div>
      <GridBoard
        :items="playerItems" zone="player"
        :is-enemy="false" :is-battle="false"
        :compact="false" :cell-size="cellSize"
        :rows="1" :unlocked-cols="unlockedCols"
      />
    </div>
  </div>
</div>
</template>

<script setup>
import { computed } from 'vue'
import GridBoard   from './GridBoard.vue'
import PanelStatus from './PanelStatus.vue'
import { dragState } from '../composables/useDrag.js'
import { BP_ROWS, BP_COLS } from '../composables/useInventory.js'
import { useLayout } from '../composables/useLayout.js'
useLayout({ skillBar: true })

// 根据屏幕宽度动态计算格子尺寸，避免 5 列在窄屏上溢出
// available = screenWidth - 水平内边距(20) - 间隙(4列×4px)
const MAX_COLS = 5
const cellSize = computed(() =>
  Math.min(76, Math.floor((window.innerWidth - 20 - (MAX_COLS - 1) * 4) / MAX_COLS))
)

defineProps({
  lives:           Number,
  maxLives:        Number,
  battleCount:     Number,
  playerItems:     Array,
  backpackItems:   Array,
  unlockedCols:    Number,
  hasPendingEvents:Boolean,
  isBossNext:      Boolean,
})

defineEmits(['startBattle', 'continue'])
</script>

<style scoped>
/* ── 全屏背景容器 ── */
.arrange-screen {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background:
    url('/background/bg-clear.png') center 55% / cover no-repeat;
}

/* ── 状态栏 + 标题 ── */
.arrange-header {
  flex-shrink: 0;
  background: rgba(8, 5, 1, 0.92);
  border-bottom: 1px solid rgba(140,80,20,.4);
}

.arrange-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px 10px;
}

.panel-title { font-size: 12px; color: var(--text-dim); letter-spacing: 1px; }

.go-battle-btn {
  padding: 7px 16px; border-radius: 6px; font-size: 13px; font-weight: bold;
  cursor: pointer; font-family: inherit;
  background: linear-gradient(135deg, #7a1a08, #c0350a);
  color: #f0d9b5; border: 1px solid #c04010;
  box-shadow: 0 2px 6px rgba(150,50,10,.3);
  transition: filter .1s;
}
.go-battle-btn:hover { filter: brightness(1.12); }
.continue-btn {
  background: linear-gradient(135deg, #1a4a7a, #2a6ab0);
  border-color: #3a80c0;
}
.boss-btn {
  background: linear-gradient(135deg, #5a0a0a, #a01818);
  border-color: #c02020;
  animation: boss-glow .9s ease-in-out infinite alternate;
}
@keyframes boss-glow {
  from { box-shadow: 0 2px 6px rgba(180,20,20,.3); }
  to   { box-shadow: 0 2px 18px rgba(220,40,40,.7); }
}

/* ── 背包+阵容整体容器，推到底部 ── */
.bottom-content {
  margin: auto 0;
  width: 100%;
  display: flex;
  flex-direction: column;
}

/* ── 背包区 ── */
.backpack-section {
  padding: 20px 10px 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.section-label {
  font-size: 11px;
  color: #f0c040;
  letter-spacing: 2px;
  flex-shrink: 0;
  text-shadow: 0 1px 6px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.6);
}

.backpack-empty {
  font-size: 11px;
  color: var(--text-dim); opacity: .6;
  text-align: center; pointer-events: none;
}

/* ── 阵容区 ── */
.formation-section {
  padding: 18px 10px 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}
</style>
