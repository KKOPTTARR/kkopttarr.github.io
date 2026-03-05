<template>
  <div class="gambler-screen">
    <PanelStatus :lives="lives" :max-lives="maxLives" :battle-count="battleCount" />
    <div class="gambler-header">
      <span class="gambler-title">🎲 赌徒的骰子</span>
      <button class="gambler-skip-btn" @click="$emit('skip')">跳过</button>
    </div>

    <div class="gambler-body">
      <div class="big-dice">
        <span v-for="i in 9" :key="i" class="dot" :class="{ active: DOT_MAP[decorFace].includes(i) }" />
      </div>
      <p class="gambler-flavor">掷出骰子，命运由天定</p>
      <p class="gambler-hint">1~6 点各有不同结局</p>
    </div>

    <div class="gambler-footer">
      <button class="btn btn-primary roll-btn" @click="$emit('confirm')">
        🎲 掷骰子
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import PanelStatus from './PanelStatus.vue'

defineProps({
  lives:       Number,
  maxLives:    Number,
  battleCount: Number,
})

defineEmits(['confirm', 'skip'])

const DOT_MAP = {
  1: [5],
  2: [3, 7],
  3: [3, 5, 7],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
}

// 随机显示一个装饰骰子面
const decorFace = ref(Math.floor(Math.random() * 6) + 1)
</script>

<style scoped>
.gambler-screen {
  position: fixed; top: 0; bottom: 0; left: 50%; transform: translateX(-50%);
  width: 100%; max-width: 600px; z-index: 200;
  display: flex; flex-direction: column;
  background:
    linear-gradient(rgba(4,8,18,.65), rgba(4,8,18,.65)),
    url('/background/bg-sea-chart.png') center / cover no-repeat;
}

.gambler-header {
  flex-shrink: 0; display: flex; justify-content: space-between; align-items: center;
  padding: 14px 14px 10px;
  border-bottom: 1px solid var(--panel-border);
}
.gambler-title { font-size: 16px; font-weight: bold; color: #f0c040; }
.gambler-skip-btn {
  padding: 6px 14px; border-radius: 6px; font-size: 12px;
  background: var(--panel); border: 1px solid var(--panel-border);
  color: var(--text-dim); cursor: pointer; font-family: inherit;
}
.gambler-skip-btn:hover { border-color: #f0c040; color: #f0c040; }

.gambler-body {
  flex: 1;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 20px;
  padding: 32px 24px;
}

.big-dice {
  width: 120px; height: 120px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  padding: 18px; gap: 8px;
  border-radius: 22px;
  background: rgba(0,0,0,.55);
  border: 2px solid rgba(255,255,255,.12);
  box-shadow: 0 0 40px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.06);
}
.dot {
  border-radius: 50%;
  display: block;
  width: 100%; height: 100%;
  background: transparent;
}
.dot.active {
  background: #f0c040;
  box-shadow: 0 0 8px #f0c040;
}

.gambler-flavor {
  font-size: 18px;
  font-weight: bold;
  color: var(--text);
  letter-spacing: .5px;
  margin: 0;
}
.gambler-hint {
  font-size: 13px;
  color: var(--text-dim);
  margin: 0;
  opacity: .7;
}

.gambler-footer {
  flex-shrink: 0; padding: 10px 14px;
  border-top: 1px solid var(--panel-border);
  background: var(--panel);
}
.roll-btn { width: 100%; padding: 12px; font-size: 15px; letter-spacing: .5px; }
</style>
