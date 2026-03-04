<template>
  <div class="preview-screen">

    <!-- 战役进度 Banner -->
    <div class="day-banner" :key="battleCount">
      <span class="day-num">第 {{ battleCount }} 战</span>
      <span class="day-sub">{{ wins }}/10 胜 · {{ livesText }}</span>
    </div>

    <!-- 敌方区域 -->
    <div class="side-section enemy-section">
      <div class="side-header">
        <span class="side-label enemy-label">对手</span>
        <span class="side-name enemy-name">{{ enemyName }}</span>
        <div class="side-hp">
          <div class="mini-bar-bg"><div class="mini-bar enemy-bar" :style="{ width: '100%' }"></div></div>
          <span class="mini-hp-text">{{ enemyHp }}</span>
        </div>
      </div>
      <div class="preview-grid-wrap">
        <GridBoard :items="enemyItems" :is-enemy="true" :is-battle="false" :compact="false" :cell-size="cellSize" />
      </div>
      <!-- 威胁评估 -->
      <div class="threat-row" v-if="threatLevel">
        <span class="threat-label">预估威胁</span>
        <span class="threat-val" :class="`threat-${threatLevel.level}`">{{ threatLevel.label }}</span>
        <span class="threat-hint">{{ threatLevel.hint }}</span>
      </div>
    </div>

    <!-- VS 分隔 -->
    <div class="vs-divider">
      <span class="vs-line"></span>
      <span class="vs-text">⚔️</span>
      <span class="vs-line"></span>
    </div>

    <!-- 我方区域 -->
    <div class="side-section player-section">
      <div class="side-header">
        <span class="side-label player-label">我方</span>
        <span class="side-name player-name">瓦内莎</span>
        <div class="side-hp">
          <div class="mini-bar-bg"><div class="mini-bar player-bar" :style="{ width: '100%' }"></div></div>
          <span class="mini-hp-text">{{ playerHp }}</span>
        </div>
      </div>
      <div class="preview-grid-wrap">
        <GridBoard :items="playerItems" :is-enemy="true" :is-battle="false" :compact="false" :cell-size="cellSize" />
      </div>
      <div class="my-power-row" v-if="playerItems.length">
        <span class="power-label">我方物品</span>
        <span class="power-val">{{ playerItems.length }} 件</span>
        <span class="power-hint" v-if="playerItems.length === 0">⚠️ 无物品，建议返回购买</span>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="preview-actions">
      <button class="btn btn-secondary back-btn" @click="$emit('go-back')">
        ← 返回调整
      </button>
      <button
        class="btn btn-fight"
        @click="$emit('confirm-battle')"
        :disabled="playerItems.length === 0"
      >
        ⚔️ 确认开战！
      </button>
    </div>

  </div>
</template>

<script setup>
import { computed } from 'vue'
import GridBoard from './GridBoard.vue'

// 根据屏幕宽度动态计算格子尺寸，避免 5 列溢出
// .side-section padding: 8px 10px → 水平各 10px = 20px
const MAX_COLS = 5
const cellSize = computed(() =>
  Math.min(90, Math.floor((window.innerWidth - 20 - (MAX_COLS - 1) * 4) / MAX_COLS))
)

const props = defineProps({
  battleCount: { type: Number, required: true },
  wins:        { type: Number, required: true },
  lives:       { type: Number, required: true },
  enemyName:   { type: String, required: true },
  enemyHp:     { type: Number, required: true },
  enemyItems:  { type: Array,  default: () => [] },
  playerHp:    { type: Number, required: true },
  playerItems: { type: Array,  default: () => [] },
})
defineEmits(['go-back', 'confirm-battle'])

const livesText = computed(() =>
  '⚡'.repeat(props.lives) + '○'.repeat(Math.max(0, 3 - props.lives))
)

// 简单威胁评估：敌方总伤害 vs 玩家总护盾/治疗
const threatLevel = computed(() => {
  if (!props.enemyItems.length) return null
  const enemyDps = props.enemyItems.reduce((s, i) =>
    s + (i.damage > 0 ? i.damage / (i.cooldown / 1000) : 0), 0)
  const playerDefense = props.playerItems.reduce((s, i) =>
    s + (i.heal || 0) * 2 + (i.shield || 0), 0)

  if (enemyDps === 0) return { level: 'low', label: '低', hint: '敌方无直接伤害' }
  if (enemyDps > 40) return { level: 'high', label: '高 ⚠️', hint: `敌方每秒约 ${Math.round(enemyDps)} 伤害` }
  if (enemyDps > 20) return { level: 'mid',  label: '中',    hint: `敌方每秒约 ${Math.round(enemyDps)} 伤害` }
  return { level: 'low', label: '低', hint: `敌方每秒约 ${Math.round(enemyDps)} 伤害` }
})
</script>

<style scoped>
.preview-screen {
  display: flex; flex-direction: column;
  height: 100%; overflow-y: auto; overflow-x: hidden;
  padding-bottom: 4px;
}

/* ── 天数 Banner ── */
@keyframes banner-drop {
  0%  { opacity: 0; transform: translateY(-16px); }
  100%{ opacity: 1; transform: translateY(0); }
}
.day-banner {
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px;
  background: linear-gradient(90deg, #1a0e04, #2a1808);
  border-bottom: 2px solid var(--panel-border);
  animation: banner-drop .4s ease-out;
}
.day-num  { font-size: 18px; font-weight: 900; color: var(--gold); }
.day-sub  { font-size: 13px; color: var(--text-dim); }

/* ── 对手 / 我方 区域 ── */
.side-section {
  flex-shrink: 0; padding: 8px 10px;
  display: flex; flex-direction: column; gap: 6px;
}
.enemy-section { background: rgba(30,10,4,.5); }
.player-section{ background: rgba(4,18,4,.5); }

.side-header {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
}
.side-label  { font-size: 10px; padding: 1px 5px; border-radius: 4px; font-weight: bold; }
.enemy-label { background: rgba(200,80,30,.2); color: #e08060; border: 1px solid rgba(200,80,30,.3); }
.player-label{ background: rgba(80,160,80,.2); color: #80c880; border: 1px solid rgba(80,160,80,.3); }
.side-name   { font-size: 14px; font-weight: bold; flex: 1; }
.enemy-name  { color: #e08060; }
.player-name { color: var(--gold); }

.side-hp     { display: flex; align-items: center; gap: 4px; }
.mini-bar-bg { width: 70px; height: 8px; background: #0a0804; border-radius: 4px; overflow: hidden; border: 1px solid rgba(255,255,255,.08); }
.mini-bar    { height: 100%; border-radius: 4px; }
.enemy-bar   { background: linear-gradient(90deg,#7a1010,#c02020); }
.player-bar  { background: linear-gradient(90deg,#1a5c2a,#27ae60); }
.mini-hp-text{ font-size: 11px; color: var(--text-dim); }

.preview-grid-wrap { display: flex; justify-content: center; }

/* 威胁评估 */
.threat-row, .my-power-row {
  display: flex; align-items: center; gap: 6px; font-size: 11px; padding: 2px 0;
}
.threat-label, .power-label { color: var(--text-dim); }
.threat-val { font-weight: bold; }
.threat-low  { color: #5ad070; }
.threat-mid  { color: var(--gold); }
.threat-high { color: #ff7050; }
.threat-hint, .power-hint { color: var(--text-dim); font-size: 10px; }
.power-val   { color: var(--gold); font-weight: bold; }

/* ── VS 分隔 ── */
.vs-divider {
  flex-shrink: 0;
  display: flex; align-items: center; gap: 8px; padding: 4px 14px;
}
.vs-line { flex: 1; height: 1px; background: linear-gradient(90deg,transparent,rgba(200,134,10,.25),transparent); }
.vs-text { font-size: 14px; opacity: .5; }

/* ── 按钮区 ── */
.preview-actions {
  flex-shrink: 0;
  display: flex; gap: 8px; padding: 8px 10px;
  border-top: 1px solid var(--panel-border);
  background: var(--panel);
}
.back-btn { flex: 1; }
.btn-fight {
  flex: 2;
  border: none; border-radius: 6px; padding: 10px;
  font-size: 14px; font-weight: bold; cursor: pointer;
  font-family: inherit;
  background: linear-gradient(135deg, #7a1a08, #c0350a);
  color: #f0d9b5;
  border: 1px solid #c04010;
  box-shadow: 0 2px 10px rgba(150,50,10,.4);
  transition: filter .1s, transform .1s;
}
.btn-fight:hover:not(:disabled) { filter: brightness(1.12); }
.btn-fight:active:not(:disabled){ transform: scale(.95); }
.btn-fight:disabled { opacity: .35; cursor: not-allowed; }
</style>
