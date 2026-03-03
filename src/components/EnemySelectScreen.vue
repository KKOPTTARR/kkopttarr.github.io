<template>
  <div class="enemy-select-screen">

    <!-- 标题区 -->
    <div class="select-header">
      <div class="select-title">⚔️ 选择对手</div>
      <div class="select-sub">难度越高，奖励越丰厚</div>
    </div>

    <!-- 三列竖卡片 -->
    <div class="select-cards">
      <div
        v-for="enemy in enemies"
        :key="enemy.id + enemy.difficulty"
        class="enemy-card"
        :class="`card-${enemy.difficulty}`"
        @click="$emit('select', enemy)"
      >
        <!-- 立绘 -->
        <img class="card-portrait" :src="`/${enemy.portrait}`" :alt="enemy.name" draggable="false" />

        <!-- 难度标签 -->
        <div class="card-diff" :class="`diff-${enemy.difficulty}`">
          {{ DIFF_LABELS[enemy.difficulty] }}
        </div>

        <!-- 敌人名称 -->
        <div class="card-name" :class="`name-${enemy.difficulty}`">{{ enemy.name }}</div>

        <!-- HP & 技能数 -->
        <div class="card-stats">
          <span class="card-stat">❤️ {{ enemy.hp }}</span>
          <span class="card-stat">⚡ {{ enemy.abilities.length }} 技能</span>
        </div>

        <div class="card-divider"></div>

        <!-- 奖励 -->
        <div class="card-reward-label">胜利奖励</div>
        <div class="card-reward-count" :class="`reward-color-${enemy.difficulty}`">
          {{ REWARD_DESCS[enemy.difficulty] }}
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { useLayout } from '../composables/useLayout.js'
useLayout({ skillBar: true })

defineProps({
  enemies:     { type: Array,  required: true },
  lives:       { type: Number, required: true },
  maxLives:    { type: Number, required: true },
  battleCount: { type: Number, required: true },
  wins:        { type: Number, required: true },
  gold:        { type: Number, required: true },
})
defineEmits(['select'])

const DIFF_LABELS  = { normal: '普通', elite: '精英', radiant: '辉耀' }
const REWARD_DESCS = {
  normal:  '青铜随机物品 ×3',
  elite:   '青铜～白银随机物品 ×4',
  radiant: '白银～黄金随机物品 ×5',
}
</script>

<style scoped>
.enemy-select-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 100%;
  background:
    linear-gradient(180deg,
      rgba(0,0,0,.72) 0%,
      rgba(0,0,0,.38) 18%,
      rgba(0,0,0,.32) 80%,
      rgba(0,0,0,.65) 100%),
    url('/background/bg-treasure-map.png') center 40% / cover no-repeat;
  padding: 24px 16px;
  gap: 24px;
}

/* ── 标题 ── */
.select-header {
  text-align: center;
  display: flex; flex-direction: column; gap: 8px;
  background: rgba(6,4,1,.70);
  backdrop-filter: blur(8px);
  padding: 10px 24px; border-radius: 12px;
  border: 1px solid rgba(180,100,30,.25);
}
.select-title {
  font-size: 26px; font-weight: 700;
  color: #e8c87a;
  text-shadow: 0 0 12px rgba(220,160,60,.5);
  letter-spacing: 1px;
}
.select-sub { font-size: 13px; color: #9e8060; }

/* ── 卡片组 ── */
.select-cards {
  display: flex; gap: 12px;
  width: 100%; max-width: 700px;
  align-items: stretch;
}

/* ── 单张卡片 ── */
.enemy-card {
  flex: 1;
  display: flex; flex-direction: column; align-items: center;
  gap: 8px;
  padding: 8px 8px 14px;
  overflow: hidden;
  background: linear-gradient(160deg, rgba(46,26,8,.82), rgba(30,16,8,.88));
  border: 1px solid rgba(160,90,30,.55);
  border-radius: 14px;
  cursor: pointer;
  backdrop-filter: blur(4px);
  box-shadow: 0 4px 16px rgba(0,0,0,.5), inset 0 1px 0 rgba(200,130,40,.10);
  transition: transform .15s, border-color .15s, box-shadow .15s;
  text-align: center;
}
.enemy-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0,0,0,.5);
}
.enemy-card:active { transform: translateY(0); }

.card-normal:hover  { border-color: #5a9e5a; box-shadow: 0 8px 24px rgba(60,140,60,.3); }
.card-elite:hover   { border-color: #9060c8; box-shadow: 0 8px 24px rgba(120,60,200,.4); }
.card-radiant:hover { border-color: #d4a820; box-shadow: 0 8px 24px rgba(200,160,20,.4); }

/* ── 立绘 ── */
.card-portrait {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 8px;
  margin-bottom: 2px;
}

/* ── 难度标签 ── */
.card-diff {
  font-size: 11px; font-weight: bold;
  padding: 2px 10px; border-radius: 10px;
  letter-spacing: .5px;
}
.diff-normal  { background: rgba(90,158,90,.2);   color: #7acc7a; border: 1px solid rgba(90,158,90,.5); }
.diff-elite   { background: rgba(144,96,200,.2);  color: #b880f0; border: 1px solid rgba(144,96,200,.5); }
.diff-radiant { background: rgba(212,168,32,.2);  color: #e8c840; border: 1px solid rgba(212,168,32,.5); }

/* ── 名称 ── */
.card-name {
  font-size: 14px; font-weight: 700;
  line-height: 1.3;
}
.name-normal  { color: #7acc7a; }
.name-elite   { color: #b880f0; }
.name-radiant { color: #e8c840; }

/* ── 属性 ── */
.card-stats {
  display: flex; flex-direction: column; gap: 2px;
}
.card-stat { font-size: 11px; color: #9e8060; }

/* ── 分割线 ── */
.card-divider {
  width: 60%; height: 1px;
  background: rgba(200,140,40,.2);
  margin: 2px 0;
}

/* ── 奖励 ── */
.card-reward-label {
  font-size: 10px; color: #7a6040;
  letter-spacing: 1px; text-transform: uppercase;
}
.card-reward-count {
  font-size: 11px; font-weight: 700;
  line-height: 1.4; text-align: center;
}
.reward-color-normal  { color: #7acc7a; }
.reward-color-elite   { color: #b880f0; }
.reward-color-radiant { color: #e8c840; }
</style>
