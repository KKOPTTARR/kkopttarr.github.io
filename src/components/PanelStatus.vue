<template>
  <div class="panel-status">
    <div class="status-lives">
      <span v-for="i in maxLives" :key="i" class="heart-icon">{{ i <= lives ? '⚡' : '○' }}</span>
    </div>
    <div class="status-info" :class="{ 'status-boss': isBoss }">
      <span class="chapter-label">第{{ chapterNum }}章 {{ chapterName }}</span>
      <span class="divider">·</span>
      <span class="battle-label">
        <span v-if="isBoss" class="boss-tag">💀 BOSS</span>
        <span v-else>⚔️ {{ battlePos }}/{{ BATTLES_PER_CHAPTER }}</span>
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import GC       from '../../config/gameConfig.json'
import CHAPTERS from '../../config/chapters.json'

const { BATTLES_PER_CHAPTER, CHAPTER_COUNT } = GC

const props = defineProps({
  lives:       Number,
  maxLives:    Number,
  battleCount: Number,
})

const chapterNum  = computed(() => Math.floor(props.battleCount / BATTLES_PER_CHAPTER) + 1)
const battlePos   = computed(() => (props.battleCount % BATTLES_PER_CHAPTER) + 1)
const isBoss      = computed(() => battlePos.value === BATTLES_PER_CHAPTER)
const chapterName = computed(() => {
  const c = chapterNum.value
  return CHAPTERS.find(ch => ch.chapter === c)?.name ?? (c > CHAPTER_COUNT ? '无尽' : '')
})
</script>

<style scoped>
.panel-status {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 14px 6px;
  border-bottom: 1px solid var(--panel-border);
  flex-shrink: 0;
}
.status-lives { display: flex; gap: 4px; }
.status-info  {
  display: flex; align-items: center; gap: 5px;
  font-size: 12px; color: var(--text-dim);
  transition: color .2s;
}
.status-info.status-boss { color: #e05040; }
.chapter-label { opacity: .85; }
.divider { opacity: .4; }
.battle-label { font-weight: bold; }
.boss-tag {
  color: #e05040; font-weight: bold; letter-spacing: .5px;
  animation: boss-pulse 1.2s ease-in-out infinite;
}
@keyframes boss-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: .5; }
}
</style>
