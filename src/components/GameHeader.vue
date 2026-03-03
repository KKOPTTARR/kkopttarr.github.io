<template>
  <div class="game-header">
    <div class="day-area">
      <span class="day-text">第 {{ day }} 天</span>
      <span class="wins-text">胜利 {{ wins }}/10</span>
    </div>
    <div class="lives-area">
      <span class="lives-label">士气</span>
      <span class="lives-icons">
        <span v-for="i in 3" :key="i">{{ i <= lives ? '⚡' : '○' }}</span>
      </span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  day:   { type: Number, required: true },
  wins:  { type: Number, required: true },
  lives: { type: Number, required: true },
})
</script>

<style scoped>
.game-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 12px; background: var(--panel);
  border-bottom: 1px solid var(--panel-border);
  height: 44px; flex-shrink: 0;
}
.day-area  { display: flex; gap: 12px; align-items: center; }
.day-text  { font-size: 15px; font-weight: bold; color: var(--gold); }
.wins-text { color: var(--text-dim); font-size: 12px; }
.lives-area { display: flex; align-items: center; gap: 4px; }
.lives-label { color: var(--text-dim); font-size: 12px; }
.lives-icons { font-size: 16px; letter-spacing: 1px; }
</style>
