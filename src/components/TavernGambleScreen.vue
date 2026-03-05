<template>
  <div class="tavern-screen">
    <PanelStatus :lives="lives" :max-lives="maxLives" :battle-count="battleCount" />
    <div class="tv-header">
      <span class="tv-title">🎲 猜大小</span>
      <button class="tv-skip-btn" @click="$emit('skip')">跳过</button>
    </div>

    <div class="tv-body">
      <div class="big-dice">
        <span v-for="i in 9" :key="i" class="dot" :class="{ active: DOT_MAP[decorFace].includes(i) }" />
      </div>
      <p class="tv-flavor">随机一件道具，押注命运</p>
      <p class="tv-hint">猜中升品质，猜错降品质</p>
    </div>

    <div class="tv-footer">
      <button class="guess-btn guess-low" @click="$emit('confirm', 'low')">小</button>
      <button class="guess-btn guess-high" @click="$emit('confirm', 'high')">大</button>
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
  1: [5], 2: [3, 7], 3: [3, 5, 7],
  4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9],
}
const decorFace = ref(Math.floor(Math.random() * 6) + 1)
</script>

<style scoped>
.tavern-screen {
  position: fixed; top: 0; bottom: 0; left: 50%; transform: translateX(-50%);
  width: 100%; max-width: 600px; z-index: 200;
  display: flex; flex-direction: column;
  background:
    linear-gradient(rgba(10,6,2,.75), rgba(10,6,2,.75)),
    url('/background/bg-sea-chart.png') center / cover no-repeat;
}

.tv-header {
  flex-shrink: 0; display: flex; justify-content: space-between; align-items: center;
  padding: 14px 14px 10px;
  border-bottom: 1px solid var(--panel-border);
}
.tv-title { font-size: 16px; font-weight: bold; color: #c09040; }
.tv-skip-btn {
  padding: 6px 14px; border-radius: 6px; font-size: 12px;
  background: var(--panel); border: 1px solid var(--panel-border);
  color: var(--text-dim); cursor: pointer; font-family: inherit;
}
.tv-skip-btn:hover { border-color: #c09040; color: #c09040; }

.tv-body {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 20px 20px 28px; gap: 20px;
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
  border-radius: 50%; display: block;
  width: 100%; height: 100%;
  background: transparent;
}
.dot.active {
  background: #f0c040;
  box-shadow: 0 0 8px #f0c040;
}

.tv-flavor {
  font-size: 18px; font-weight: bold;
  color: var(--text); letter-spacing: .5px; margin: 0;
}
.tv-hint {
  font-size: 13px; color: var(--text-dim); margin: 0; opacity: .7;
}

.tv-footer {
  flex-shrink: 0; display: flex; gap: 10px;
  padding: 12px 14px;
  border-top: 1px solid var(--panel-border);
  background: rgba(0,0,0,.35);
  backdrop-filter: blur(6px);
}
.guess-btn {
  flex: 1; padding: 16px 10px; border-radius: 10px;
  font-size: 18px; font-weight: bold; letter-spacing: 2px;
  cursor: pointer; font-family: inherit; border: 2px solid transparent;
  transition: border-color .14s, filter .14s;
}
.guess-btn:hover { border-color: currentColor; filter: brightness(1.15); }
.guess-low  { background: rgba(80,110,200,.22); color: #8aa8f0; }
.guess-high { background: rgba(200,130,30,.22);  color: #f0a840; }
</style>
