<template>
  <div class="map-screen">

    <!-- 顶部进度 -->
    <div class="map-header">
      <span class="map-title">⛵ 选择航线</span>
      <div class="map-status">
        <span class="map-battle">第 {{ battleCount }} 战</span>
        <span class="map-wins">{{ wins }}/10 胜</span>
        <span class="map-lives">{{ livesText }}</span>
      </div>
    </div>

    <!-- 副标题 -->
    <div class="map-subtitle">下一站，你要去哪里？</div>

    <!-- 3 条航线 -->
    <div class="node-list">
      <div
        v-for="node in nodes"
        :key="node.type"
        class="node-card"
        :class="`node-${node.type}`"
        @click="$emit('select-node', node.type)"
      >
        <div class="node-icon">{{ node.icon }}</div>
        <div class="node-body">
          <div class="node-name">{{ node.name }}</div>
          <div class="node-desc">{{ node.desc }}</div>
        </div>
        <div class="node-reward" :class="`reward-${node.type}`">{{ node.reward }}</div>
        <div class="node-arrow">›</div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  battleCount: { type: Number, required: true },
  wins:        { type: Number, required: true },
  lives:       { type: Number, required: true },
})

defineEmits(['select-node'])

const livesText = computed(() =>
  '❤️'.repeat(props.lives) + '🖤'.repeat(Math.max(0, 3 - props.lives))
)

const nodes = [
  {
    type:   'elite',
    icon:   '⚔️',
    name:   '强敌',
    desc:   '敌方血量 ×1.5，更难打',
    reward: '+3 金',
  },
  {
    type:   'market',
    icon:   '🏪',
    name:   '黑市',
    desc:   '商店展示 5 件物品，货源更广',
    reward: '5 格位',
  },
  {
    type:   'normal',
    icon:   '🌊',
    name:   '顺风',
    desc:   '正常难度，海风带来额外金币',
    reward: '+2 金',
  },
]
</script>

<style scoped>
.map-screen {
  display: flex; flex-direction: column;
  height: 100%; overflow-y: auto;
  background:
    radial-gradient(ellipse at 50% 45%,
      rgba(0,0,0,.20) 0%,
      rgba(0,0,0,.38) 50%,
      rgba(0,0,0,.65) 100%),
    url('/background/bg-treasure-map.png') center / cover no-repeat;
}

/* ── 顶部进度条 ── */
.map-header {
  flex-shrink: 0;
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(140,80,20,.35);
  background: rgba(6,4,1,.75);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
.map-title  { font-size: 16px; font-weight: 900; color: var(--gold); letter-spacing: 1px; }
.map-status { display: flex; align-items: center; gap: 10px; }
.map-battle { font-size: 12px; color: var(--text-dim); }
.map-wins   { font-size: 13px; color: var(--gold); font-weight: bold; }
.map-lives  { font-size: 14px; letter-spacing: 1px; }

/* ── 副标题 ── */
.map-subtitle {
  flex-shrink: 0;
  text-align: center; font-size: 12px;
  color: var(--text-dim); padding: 10px 14px 4px;
  letter-spacing: 2px;
}

/* ── 航线列表 ── */
.node-list {
  flex: 1; display: flex; flex-direction: column;
  justify-content: center; gap: 10px;
  padding: 12px 14px 20px;
}

.node-card {
  display: flex; align-items: center; gap: 12px;
  padding: 16px 14px;
  border-radius: 10px;
  border: 1px solid rgba(180,100,30,.30);
  background: rgba(20,12,4,.70);
  cursor: pointer;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  box-shadow: 0 3px 12px rgba(0,0,0,.40);
  transition: border-color .15s, background .15s, transform .12s, box-shadow .15s;
  position: relative;
}
.node-card:hover  { background: rgba(255,255,255,.07); transform: translateX(4px); }
.node-card:active { transform: scale(.97) translateX(2px); }

/* 各路线主题色 */
.node-elite:hover  { border-color: #e04010; box-shadow: 0 0 18px rgba(200,60,10,.3); }
.node-market:hover { border-color: var(--gold); box-shadow: 0 0 18px rgba(200,134,10,.25); }
.node-normal:hover { border-color: #3a90e0;  box-shadow: 0 0 18px rgba(30,100,200,.25); }

.node-elite  { border-color: rgba(200,80,30,.25); }
.node-market { border-color: rgba(200,160,30,.25); }
.node-normal { border-color: rgba(30,120,200,.25); }

.node-icon { font-size: 30px; flex-shrink: 0; width: 40px; text-align: center; }

.node-body { flex: 1; display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.node-name { font-size: 15px; font-weight: bold; color: var(--text); }
.node-desc { font-size: 11px; color: var(--text-dim); line-height: 1.4; }

.node-reward {
  flex-shrink: 0;
  font-size: 12px; font-weight: bold;
  padding: 4px 10px;
  border-radius: 20px;
  white-space: nowrap;
}
.reward-elite  { color: #ff8060; background: rgba(200,80,30,.12);  border: 1px solid rgba(200,80,30,.25); }
.reward-market { color: var(--gold); background: rgba(200,134,10,.12); border: 1px solid rgba(200,134,10,.25); }
.reward-normal { color: #60b4ff;  background: rgba(30,100,200,.12);  border: 1px solid rgba(30,100,200,.25); }

.node-arrow {
  flex-shrink: 0; font-size: 18px; color: var(--text-dim);
  transition: transform .12s;
}
.node-card:hover .node-arrow { transform: translateX(3px); color: var(--text); }
</style>
