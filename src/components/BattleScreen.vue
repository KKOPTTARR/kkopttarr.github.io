<template>
  <!-- 战斗速度控制（顶部） -->
  <div class="speed-bar">
    <button
      v-for="s in [0.1,0.5,1,2,3,10]"
      :key="s"
      class="speed-btn"
      :class="{ active: battleSpeed === s }"
      @click="$emit('speedChange', s)"
    >{{ s }}x</button>
  </div>

  <!-- 敌方 HP 条 -->
  <div class="hp-strip enemy-strip" :class="enemyHitClass" id="enemy-hp-zone">
    <span class="hp-strip-name enemy-name-t">{{ currentEnemy.name }}</span>
    <div class="hp-strip-bar">
      <div class="hp-bar enemy" :style="{ width: enemyHpPct + '%' }"></div>
    </div>
    <span class="hp-strip-text">{{ enemyStat.hp }}<span class="hp-max">/{{ enemyStat.maxHp }}</span></span>
    <span v-if="enemyStat.shield > 0" class="strip-shield">🛡{{ enemyStat.shield }}</span>
  </div>

  <!-- 战斗舞台 -->
  <BattleArena
    ref="battleArenaRef"
    :player-items="playerItems"
    :enemy-abilities="enemyAbilities"
    :enemy-stat="enemyStat"
    :player-stat="playerStat"
    :enemy-name="currentEnemy.name"
    :enemy-portrait="currentEnemy.portrait"
    :latest-attack="latestAttack"
    :unlocked-cols="unlockedCols"
    @deploy-complete="$emit('deployComplete')"
  />

  <!-- 玩家 HP 条（最底，全宽） -->
  <div class="hp-strip player-strip" :class="playerHitClass" id="player-hp-zone">
    <span class="hp-strip-name player-name-t">{{ selectedIdentityName || '船长' }}</span>
    <div class="hp-strip-bar">
      <div class="hp-bar player" :style="{ width: playerHpPct + '%' }"></div>
    </div>
    <span class="hp-strip-text">{{ playerStat.hp }}<span class="hp-max">/{{ playerStat.maxHp }}</span></span>
    <span v-if="playerStat.shield > 0" class="strip-shield">🛡{{ playerStat.shield }}</span>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import BattleArena from './BattleArena.vue'
import { useLayout } from '../composables/useLayout.js'
useLayout({ skillBar: true })

const props = defineProps({
  playerStat:          Object,
  enemyStat:           Object,
  battleSpeed:         Number,
  playerItems:         Array,
  enemyAbilities:      Array,
  currentEnemy:        Object,
  latestAttack:        Object,
  unlockedCols:        Number,
  playerHitClass:      String,
  enemyHitClass:       String,
  selectedIdentityName:String,
})

defineEmits(['speedChange', 'deployComplete'])

const battleArenaRef = ref(null)

const playerHpPct = computed(() =>
  Math.max(0, Math.min(100, props.playerStat.hp / props.playerStat.maxHp * 100))
)
const enemyHpPct = computed(() =>
  Math.max(0, Math.min(100, props.enemyStat.hp / props.enemyStat.maxHp * 100))
)

defineExpose({
  startDeploy(srcRects, dstRects) { battleArenaRef.value?.startBattleDeploy(srcRects, dstRects) },
  onBattleStart()                 { battleArenaRef.value?.onBattleStart() },
})
</script>

<style scoped>
/* ── 战斗速度（顶部） ── */
.speed-bar {
  flex-shrink: 0; display: flex; justify-content: center; gap: 6px;
  padding: 4px 8px; background: rgba(0,0,0,.2);
  border-bottom: 1px solid var(--panel-border);
}
.speed-btn {
  border: 1px solid var(--panel-border); border-radius: 5px;
  background: var(--panel); color: var(--text-dim);
  font-size: 11px; font-weight: bold; padding: 3px 10px;
  cursor: pointer; font-family: inherit;
  transition: background .1s, color .1s, border-color .1s;
}
.speed-btn.active {
  background: var(--panel-border); color: var(--gold);
  border-color: var(--gold);
}
.speed-btn:first-child {
  color: #7ec8e3;
  border-color: rgba(126,200,227,.35);
}
.speed-btn:first-child.active {
  background: rgba(126,200,227,.15);
  color: #7ec8e3; border-color: #7ec8e3;
}

/* ── HP 条带 ── */
.hp-strip {
  flex-shrink: 0; display: flex; align-items: center; gap: 6px;
  padding: 5px 10px; height: 38px;
}
.enemy-strip  { background: linear-gradient(90deg,#1e0c06,#160803); border-bottom: 2px solid #4a1808; }
.player-strip { background: linear-gradient(90deg,#0c1806,#081004); border-top:    2px solid #1a3808; }

.hp-strip-name { font-size: 12px; font-weight: bold; white-space: nowrap; min-width: 60px; }
.enemy-name-t  { color: #e08060; }
.player-name-t { color: var(--gold); }
.hp-strip-bar {
  flex: 1; height: 10px; background: #0a1520;
  border-radius: 5px; overflow: hidden; border: 1px solid rgba(255,255,255,.1);
}
.hp-strip-text { font-size: 11px; color: var(--text-dim); white-space: nowrap; }
.hp-max { opacity: .6; }
.strip-shield { font-size: 11px; color: var(--freeze); }

@keyframes hit-damage-strip {
  0%   { box-shadow:none; }
  25%  { box-shadow: 0 0 24px 8px rgba(231,76,60,.55); background-color: rgba(231,76,60,.06); }
  100% { box-shadow:none; }
}
@keyframes hit-heal-strip {
  0%   { box-shadow:none; }
  25%  { box-shadow: 0 0 16px 6px rgba(46,204,113,.4); }
  100% { box-shadow:none; }
}
.hp-strip.hit-damage { animation: hit-damage-strip .45s ease-out; }
.hp-strip.hit-heal   { animation: hit-heal-strip   .4s  ease-out; }
</style>
