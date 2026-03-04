<template>
  <Transition name="bubble-fade">
    <div v-if="bubble" class="bubble" :style="bubbleStyle" @click.stop>
      <div v-if="bubble.item.tags?.length" class="bubble-tags">
        <span v-for="tag in bubble.item.tags" :key="tag" class="btag">{{ tag }}</span>
      </div>
      <div class="bubble-stats">
        <span v-if="bubble.item.damage"  class="bpill dmg">⚔️ {{ bubble.item.damage }}</span>
        <span v-if="bubble.item.heal"    class="bpill heal">💚 {{ bubble.item.heal }}</span>
        <span v-if="bubble.item.shield"  class="bpill shield">🛡 {{ bubble.item.shield }}</span>
        <span v-if="bubble.item.burn"    class="bpill burn">🔥 {{ bubble.item.burn }}</span>
        <span v-if="bubble.item.poison"  class="bpill poison">☠ {{ bubble.item.poison }}</span>
        <span class="bpill cd">⏱ {{ ((bubble.item._cooldown ?? bubble.item.cooldown) / 1000).toFixed(1) }}s</span>
      </div>

      <div v-if="bubble.item.skill_cn" class="bubble-divider" />
      <div v-if="bubble.item.skill_cn" class="bubble-skill" v-html="parseSkill(bubble.item.skill_cn)" />

      <div class="bubble-arrow" :style="{ left: arrowLeft }" />
    </div>
  </Transition>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({ bubble: { type: Object, default: null } })
defineEmits(['close'])

const SKILL_COLORS = {
  dmg:    '#ff6060',
  burn:   '#ff9040',
  heal:   '#6dcc6d',
  shield: '#60a8ff',
  poison: '#b070e8',
  val:    '#e8c840',
  charge: '#60d8ff',
  adj:    '#40c8a0',
}

function parseSkill(text) {
  return text.replace(/\{(\w+):([^}]*)\}/g, (_, type, content) => {
    const color = SKILL_COLORS[type]
    return color
      ? `<span style="color:${color};font-weight:600">${content}</span>`
      : content
  })
}

function getContainer() {
  return document.querySelector('#app > div')?.getBoundingClientRect() ?? null
}

const bubbleStyle = computed(() => {
  if (!props.bubble) return {}
  const cr = getContainer()
  if (!cr) return {}
  const pad = 14
  return {
    position: 'fixed',
    left:   (cr.left  + pad) + 'px',
    width:  (cr.width - pad * 2) + 'px',
    bottom: (window.innerHeight - props.bubble.y + 8) + 'px',
  }
})

const arrowLeft = computed(() => {
  if (!props.bubble) return '50%'
  const cr = getContainer()
  if (!cr) return '50%'
  const pad = 14
  const relX = props.bubble.x - cr.left - pad
  const bubbleW = cr.width - pad * 2
  const clamped = Math.min(Math.max(relX, 14), bubbleW - 14)
  return clamped + 'px'
})
</script>

<style scoped>
.bubble {
  z-index: 5000;
  background: #1c1108;
  border: 1px solid var(--panel-border);
  border-radius: 10px;
  box-shadow: 0 6px 24px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.04);
  padding: 12px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: auto;
}

/* ── 类型标签 ──────────────────────────────────────────── */
.bubble-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.btag {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(200, 134, 10, 0.12);
  color: #c8a050;
  border: 1px solid rgba(200, 134, 10, 0.25);
  letter-spacing: 0.5px;
}

/* ── 属性胶囊行 ────────────────────────────────────────── */
.bubble-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.bpill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
}

.bpill.dmg    { background: rgba(255, 80,  80, 0.13); color: #ff8888; }
.bpill.heal   { background: rgba(80,  200, 80, 0.13); color: #7ddd7d; }
.bpill.shield { background: rgba(60,  150, 255,0.13); color: #80b8ff; }
.bpill.burn   { background: rgba(255, 140, 50, 0.13); color: #ffa060; }
.bpill.poison { background: rgba(160, 80,  220,0.13); color: #c090e8; }
.bpill.cd     { background: rgba(255, 255, 255,0.05); color: #9a8868; }

/* ── 分隔线 ────────────────────────────────────────────── */
.bubble-divider {
  height: 1px;
  background: var(--panel-border);
  opacity: 0.35;
}

/* ── 技能描述 ──────────────────────────────────────────── */
.bubble-skill {
  font-size: 14px;
  color: #9a8868;
  line-height: 1.75;
}

/* ── 向下箭头 ──────────────────────────────────────────── */
.bubble-arrow {
  position: absolute;
  bottom: -7px;
  width: 12px;
  height: 12px;
  background: #1c1108;
  border-right: 1px solid var(--panel-border);
  border-bottom: 1px solid var(--panel-border);
  transform: translateX(-50%) rotate(45deg);
}

/* ── 过渡：出现/消失时动画，切换内容直接替换 ─────────── */
.bubble-fade-enter-active {
  transition: opacity 0.14s ease, transform 0.14s ease;
}
.bubble-fade-leave-active {
  transition: opacity 0.1s ease;
}
.bubble-fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.bubble-fade-leave-to {
  opacity: 0;
}
</style>
