<template>
  <Teleport to="body">
    <div v-if="visible" class="overlay">
      <div class="result-box">
        <div class="result-icon">{{ icon }}</div>
        <div class="result-title" :style="{ color: titleColor }">{{ title }}</div>
        <div class="result-desc">{{ desc }}</div>
        <button class="btn btn-primary" style="min-width:140px; margin-top:6px" @click="$emit('next')">
          {{ btnText }}
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  visible:  { type: Boolean, default: false },
  type:     { type: String,  default: 'win' }, // 'win' | 'lose' | 'gameover' | 'clear'
  day:      { type: Number,  default: 1 },
  wins:     { type: Number,  default: 0 },
  lives:    { type: Number,  default: 3 },
})
defineEmits(['next'])

const icon = computed(() => {
  if (props.type === 'win')      return '🏆'
  if (props.type === 'lose')     return '💀'
  if (props.type === 'clear')    return '👑'
  if (props.type === 'gameover') return '☠️'
  return '❓'
})
const title = computed(() => {
  if (props.type === 'win')      return '胜利！'
  if (props.type === 'lose')     return '战败...'
  if (props.type === 'clear')    return '通关！'
  if (props.type === 'gameover') return '游戏结束'
  return ''
})
const titleColor = computed(() => {
  if (props.type === 'win' || props.type === 'clear') return 'var(--gold)'
  return '#e74c3c'
})
const desc = computed(() => {
  if (props.type === 'win')      return `第 ${props.day} 天胜利！累计 ${props.wins}/10 胜`
  if (props.type === 'lose')     return `剩余生命：${'❤️'.repeat(props.lives)}${'🖤'.repeat(Math.max(0, 3 - props.lives))}，进入下一天`
  if (props.type === 'clear')    return '恭喜！你已累积 10 场胜利，完成了 Demo！'
  if (props.type === 'gameover') return '没有剩余生命值，本次挑战结束。'
  return ''
})
const btnText = computed(() => {
  if (props.type === 'clear' || props.type === 'gameover') return '重新开始'
  return '下一天'
})
</script>
