<template>
  <div class="battle-arena" id="battlefield">
    <canvas ref="pixiCanvas" class="pixi-overlay"></canvas>
    <div class="arena-bg"></div>

    <!-- ══ 敌方展示区（插画 + 技能列表）══ -->
    <div class="enemy-section">
      <!-- 敌人插画 -->
      <div class="enemy-portrait-wrap">
        <img :src="portraitUrl" class="enemy-portrait" :alt="enemyName" />
        <div class="portrait-vignette"></div>
        <!-- 状态 chips -->
        <div class="enemy-chips">
          <span v-if="enemyTotalBurn   > 0" class="chip burn-chip">🔥{{ enemyTotalBurn }}</span>
          <span v-if="enemyTotalPoison > 0" class="chip poison-chip">☠{{ enemyTotalPoison }}</span>
          <span v-if="enemyStat?.shield > 0" class="chip shield-chip">🛡{{ enemyStat.shield }}</span>
        </div>
      </div>

      <!-- 技能列表 -->
      <div class="ability-list">
        <div
          v-for="ab in enemyAbilities"
          :key="ab.id"
          class="ability-row"
          :class="{ triggering: ab.triggering }"
        >
          <div class="ab-header">
            <span class="ab-name">{{ ab.name }}</span>
            <span class="ab-effects">
              <span v-if="ab.damage  > 0">⚔️{{ ab.damage }}</span>
              <span v-if="ab.heal    > 0">💚{{ ab.heal }}</span>
              <span v-if="ab.shield  > 0">🛡{{ ab.shield }}</span>
              <span v-if="ab.burn    > 0">🔥{{ ab.burn }}</span>
              <span v-if="ab.poison  > 0">☠{{ ab.poison }}</span>
            </span>
          </div>
          <div class="ab-cd-track">
            <div
              class="ab-cd-fill"
              :style="{
                width: (ab.cooldownProgress / ab.cooldown * 100) + '%',
                background: ab.triggering ? '#e67e22' : cdColor(ab)
              }"
            ></div>
          </div>
        </div>
      </div>

      <!-- 敌方战斗日志（嵌在 enemy-section 内，相对定位）-->
      <TransitionGroup tag="div" class="side-log enemy-log" name="log-slide">
        <div v-for="entry in enemyLog" :key="entry.id" class="log-entry log-enemy">
          <span class="log-icon">{{ entry.icon }}</span>
          <span class="log-text">{{ entry.text }}</span>
          <span class="log-val" :class="`log-${entry.type}`">{{ entry.val }}</span>
        </div>
      </TransitionGroup>
    </div>

    <!-- ══ 中央战斗区（flex:1，攻击事件展示在此）══ -->
    <div class="combat-area">
      <div class="battle-divider">
        <template v-if="!currentAttack">
          <span class="div-line"></span>
          <span class="div-sword">⚔️</span>
          <span class="div-line"></span>
        </template>
        <template v-else>
          <div class="attack-event" :class="currentAttack.isEnemy ? 'from-top' : 'from-bottom'">
            <div class="atk-header">
              <span class="atk-name">{{ currentAttack.name }}</span>
              </div>
            <span class="atk-arrow">{{ currentAttack.isEnemy ? '▼' : '▲' }}</span>
            <div class="atk-fxs">
              <span
                v-for="(fx, i) in currentAttack.effects"
                :key="i"
                class="atk-fx"
                :class="`fx-${fx.type}`"
              >{{ fxLabel(fx) }}</span>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- ══ 玩家卡牌行 ══ -->
    <div class="player-section">
      <div class="player-chips">
        <span v-if="playerTotalBurn   > 0" class="chip burn-chip">🔥{{ playerTotalBurn }}</span>
        <span v-if="playerTotalPoison > 0" class="chip poison-chip">☠{{ playerTotalPoison }}</span>
        <span v-if="playerStat?.shield > 0" class="chip shield-chip">🛡{{ playerStat.shield }}</span>
      </div>
      <div class="arena-grid" :style="arenaGridStyle">
        <ArenaCard
          v-for="item in playerItems"
          :key="item.instanceId"
          :item="item"
        />
        <div
          v-for="cell in emptyPlayerCells"
          :key="'p-empty-' + cell.key"
          class="empty-slot"
          :style="cell.style"
        ></div>
      </div>

      <!-- 玩家战斗日志（嵌在 player-section 内，相对定位）-->
      <TransitionGroup tag="div" class="side-log player-log" name="log-slide">
        <div v-for="entry in playerLog" :key="entry.id" class="log-entry log-player">
          <span class="log-icon">{{ entry.icon }}</span>
          <span class="log-text">{{ entry.text }}</span>
          <span class="log-val" :class="`log-${entry.type}`">{{ entry.val }}</span>
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import ArenaCard from './ArenaCard.vue'
import {
  initPixi, destroyPixi,
  registerSprites, syncPositions, setItems,
  triggerAttackFlash, spawnProjectile, spawnFloatingTextAt,
} from '../composables/usePixiBattle.js'

const props = defineProps({
  playerItems:    { type: Array,  default: () => [] },
  enemyAbilities: { type: Array,  default: () => [] },
  enemyStat:      { type: Object, default: null },
  playerStat:     { type: Object, default: null },
  enemyName:      { type: String, default: '敌人' },
  enemyPortrait:  { type: String, default: '' },
  latestAttack:   { type: Object, default: null },
  unlockedCols:   { type: Number, default: 5 },
})

const emit = defineEmits(['deploy-complete'])
const pixiCanvas = ref(null)

const portraitUrl = computed(() =>
  props.enemyPortrait ? `${import.meta.env.BASE_URL}${props.enemyPortrait}` : ''
)

// ── 状态合计 ─────────────────────────────────────────────
const enemyTotalBurn    = computed(() => props.enemyStat?.burnStacks   || 0)
const enemyTotalPoison  = computed(() => props.enemyStat?.poisonStacks || 0)
const playerTotalBurn   = computed(() => props.playerStat?.burnStacks   || 0)
const playerTotalPoison = computed(() => props.playerStat?.poisonStacks || 0)

// ── 空位占位 ─────────────────────────────────────────────
function buildEmptyCells(items, ucols) {
  const occupied = new Set()
  for (const item of items) occupied.add(`0,${item.col}`)
  const cells = []
  for (let c = 0; c < ucols; c++)
    if (!occupied.has(`0,${c}`))
      cells.push({ key: `0-${c}`, style: { gridColumn: c + 1, gridRow: 1 } })
  return cells
}
const emptyPlayerCells = computed(() => buildEmptyCells(props.playerItems, props.unlockedCols))

// 动态 arena-grid 样式（行高由 aspect-ratio 自动决定）
const arenaGridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${props.unlockedCols}, 1fr)`,
}))

// ── 技能冷却条颜色 ─────────────────────────────────────────
function cdColor(ab) {
  const pct = ab.cooldownProgress / ab.cooldown
  if (pct >= 0.85) return 'linear-gradient(90deg,#c0350a,#e67e22)'
  if (pct >= 0.5)  return 'linear-gradient(90deg,#2471a3,#c0350a)'
  return '#2471a3'
}

// ── 攻击队列 ─────────────────────────────────────────────
const attackQueue      = []
const currentAttack    = ref(null)
let   processingAttack = false
const activeTimers     = []

const LOG_MAX   = 3
const enemyLog  = ref([])
const playerLog = ref([])
let   logCounter = 0

function pushLog(info) {
  if (info.isDot) return
  const fx = info.effects[0]
  if (!fx) return
  const icons = { damage:'⚔️', heal:'💚', shield:'🛡', burn:'🔥', poison:'☠️', dot:'💧' }
  const vals  = { damage:`-${fx.value}`, heal:`+${fx.value}`, shield:`🛡+${fx.value}`,
                  burn:`🔥${fx.value}层`, poison:`☠${fx.value}层`, dot:`-${fx.value}` }
  const entry = { id: ++logCounter, icon: icons[fx.type] ?? '·', text: info.name, val: vals[fx.type] ?? String(fx.value), type: fx.type }
  if (info.isEnemy) {
    enemyLog.value.push(entry)
    if (enemyLog.value.length > LOG_MAX) enemyLog.value.shift()
  } else {
    playerLog.value.unshift(entry)
    if (playerLog.value.length > LOG_MAX) playerLog.value.pop()
  }
}

function processNext() {
  if (!attackQueue.length) { processingAttack = false; currentAttack.value = null; return }
  processingAttack = true
  const info = attackQueue.shift()
  if (info.isDot) { processNext(); return }
  currentAttack.value = info
  pushLog(info)
  if (info.instanceId) triggerAttackFlash(info.instanceId)

  // 投射物飞行 → 落点触发浮字 + 目标抖动
  const effectType = info.effects?.[0]?.type || 'damage'
  spawnProjectile(info.instanceId, info.isEnemy, effectType, (impactX, impactY) => {
    for (const fx of (info.effects || [])) {
      if (fx.type === 'damage' || fx.type === 'heal' || fx.type === 'shield') {
        const text = fx.type === 'damage' ? `-${fx.value}` : fx.type === 'heal' ? `+${fx.value}` : `🛡+${fx.value}`
        spawnFloatingTextAt(impactX, impactY, text, fx.type)
      }
    }
    shakeTarget(info.isEnemy)
  })

  const t = setTimeout(() => { currentAttack.value = null; processNext() }, 650)
  activeTimers.push(t)
}

function shakeTarget(isEnemy) {
  const selector = isEnemy ? '.player-section' : '.enemy-portrait-wrap'
  const el = document.querySelector(selector)
  if (!el) return
  el.classList.remove('elem-shake')
  void el.offsetWidth
  el.classList.add('elem-shake')
}

watch(() => props.latestAttack, (info) => {
  if (!info) return
  attackQueue.push(info)
  if (!processingAttack) processNext()
})

// ── PIXI ──────────────────────────────────────────────────
onMounted(() => { _initPixiAsync() })

async function _initPixiAsync() {
  try {
    await initPixi(pixiCanvas.value)
    if (props.playerItems.length) {
      await registerSprites(props.playerItems)
      syncPositions(props.playerItems)
      setItems(props.playerItems)
    }
  } catch (e) { console.warn('[PIXI] init failed', e) }
}

onUnmounted(() => { activeTimers.forEach(clearTimeout); destroyPixi() })

function startBattleDeploy(_s, _d) { emit('deploy-complete') }
function onBattleStart() {
  setItems(props.playerItems)
  syncPositions(props.playerItems)
}
defineExpose({ startBattleDeploy, onBattleStart, syncPositions })

function fxLabel(fx) {
  const map = { damage: `-${fx.value}`, heal: `+${fx.value}`, shield: `🛡+${fx.value}`,
                burn: `🔥${fx.value}`, poison: `☠${fx.value}`, dot: `-${fx.value}` }
  return map[fx.type] ?? String(fx.value)
}
</script>

<style scoped>
.battle-arena {
  position: relative; flex: 1;
  display: flex; flex-direction: column;
  min-height: 0; overflow: hidden;
}
.pixi-overlay {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  pointer-events: none; z-index: 5;
}
.arena-bg {
  position: absolute; inset: 0; pointer-events: none;
  background:
    linear-gradient(180deg,
      rgba(10,6,3,.82) 0%,
      rgba(8,5,2,.55) 30%,
      rgba(6,4,2,.50) 55%,
      rgba(6,6,2,.70) 80%,
      rgba(8,8,3,.88) 100%),
    url('/background/bg-victory.png') center / cover no-repeat;
}

/* ── 敌方展示区（上半区，内容垂直居中）── */
.enemy-section {
  position: relative; z-index: 6;
  flex: 1;
  display: flex; flex-direction: row;
  align-items: center;
  gap: 10px; padding: 8px 12px;
  overflow: hidden;
}

/* ── 中央分隔线（攻击事件，高度固定）── */
.combat-area {
  position: relative; z-index: 6;
  flex: 0 0 auto; min-height: 44px;
  display: flex; align-items: center; justify-content: center;
}

.enemy-portrait-wrap {
  position: relative;
  width: 110px; height: 140px; flex-shrink: 0;
  border-radius: 10px; overflow: hidden;
  border: 1px solid rgba(200,80,30,.45);
  box-shadow: 0 6px 24px rgba(0,0,0,.7), 0 0 20px rgba(180,60,20,.25);
}
.enemy-portrait {
  width: 100%; height: 100%;
  object-fit: cover; object-position: center 20%;
  display: block;
}
.portrait-vignette {
  position: absolute; inset: 0;
  background: linear-gradient(to bottom, transparent 60%, rgba(0,0,0,.7) 100%);
}
.enemy-chips {
  position: absolute; bottom: 5px; left: 5px;
  display: flex; flex-wrap: wrap; gap: 3px;
}

/* ── 技能列表 ── */
.ability-list {
  flex: 1; min-width: 0;
  display: flex; flex-direction: column;
  gap: 6px; justify-content: flex-start;
}
.ability-row {
  background: rgba(180,60,20,.12);
  border: 1px solid rgba(200,80,30,.2);
  border-radius: 6px;
  padding: 5px 8px;
  transition: border-color .15s, background .15s;
}
.ability-row.triggering {
  border-color: #e67e22;
  background: rgba(230,126,34,.2);
  animation: ab-flash .4s ease-out;
}
@keyframes ab-flash {
  0%   { box-shadow: 0 0 0 rgba(230,126,34,0); }
  40%  { box-shadow: 0 0 12px rgba(230,126,34,.6); }
  100% { box-shadow: 0 0 0 rgba(230,126,34,0); }
}
.ab-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 4px;
}
.ab-name    { font-size: 11px; font-weight: bold; color: #e08050; }
.ab-effects { font-size: 10px; color: var(--text-dim); display: flex; gap: 4px; }
.ab-cd-track {
  height: 4px; border-radius: 2px;
  background: rgba(255,255,255,.08); overflow: hidden;
}
.ab-cd-fill {
  height: 100%; border-radius: 2px;
  transition: width .1s linear;
}

/* ── 状态 chips ── */
.chip         { font-size: 10px; padding: 1px 5px; border-radius: 6px; background: rgba(0,0,0,.5); }
.burn-chip    { color: var(--burn);   border: 1px solid rgba(230,120,30,.4); }
.poison-chip  { color: var(--poison); border: 1px solid rgba(100,200,50,.3); }
.shield-chip  { color: var(--freeze); border: 1px solid rgba(100,180,255,.3); }

/* ── 玩家区（下半区，内容垂直居中）── */
.player-section {
  position: relative; z-index: 6;
  flex: 1;
  padding: 8px 8px 4px;
  display: flex; flex-direction: column;
  align-items: stretch; justify-content: center; gap: 4px;
}
.player-chips { display: flex; gap: 4px; align-self: center; }

/* ── 日志 ── */
.side-log { position: absolute; right: 8px; z-index: 7; display: flex; flex-direction: column; gap: 3px; pointer-events: none; }
.enemy-log  { top: 6px; }    /* 相对 enemy-section 内部 */
.player-log { bottom: 6px; } /* 相对 player-section 内部 */
.log-entry { display: flex; align-items: center; gap: 4px; padding: 3px 8px 3px 6px; border-radius: 12px; font-size: 11px; backdrop-filter: blur(4px); width: fit-content; align-self: flex-end; }
.log-entry.log-enemy  { background: rgba(120,30,10,.55); border: 1px solid rgba(200,70,30,.35); }
.log-entry.log-player { background: rgba(20,80,30,.55);  border: 1px solid rgba(50,160,60,.35); }
.log-slide-enter-active { animation: log-pop .18s ease-out; }
.log-slide-leave-active { animation: log-fade .25s ease-in forwards; position: absolute; right: 0; }
@keyframes log-pop  { from { opacity:0; transform: translateX(8px) scale(.9); } to { opacity:1; transform:none; } }
@keyframes log-fade { from { opacity:1; } to { opacity:0; transform: translateX(6px); } }
.log-icon { font-size: 11px; flex-shrink: 0; }
.log-text { color: var(--text-dim); white-space: nowrap; max-width: 72px; overflow: hidden; text-overflow: ellipsis; }
.log-val  { font-weight: 700; white-space: nowrap; font-size: 12px; }
.log-damage { color: #ff8060; }
.log-heal   { color: #5ad070; }
.log-shield { color: var(--freeze); }
.log-burn   { color: var(--burn); }
.log-poison { color: var(--poison); }

/* ── 战斗分隔线 ── */
.battle-divider {
  flex: 0 0 auto;
  display: flex; align-items: center; justify-content: center;
  gap: 8px; width: 100%; min-height: 44px;
  position: relative; z-index: 6;
}
.div-line  { flex: 1; height: 1px; background: linear-gradient(90deg,transparent,rgba(200,134,10,.45),transparent); }
.div-sword { font-size: 20px; opacity: .55; filter: drop-shadow(0 0 6px rgba(200,134,10,.6)); }

.attack-event { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.from-bottom  { flex-direction: column-reverse; }
.atk-header   { display: flex; align-items: center; gap: 5px; }
.atk-name     { font-size: 11px; color: var(--text-dim); letter-spacing: 0.5px; }
.atk-arrow    { font-size: 14px; color: var(--gold); opacity: .8; }
.atk-fxs      { display: flex; gap: 4px; }
.atk-fx { font-size: 26px; font-weight: 900; line-height: 1; text-shadow: 0 2px 10px rgba(0,0,0,.8); animation: atk-pop .3s cubic-bezier(.3,1.5,.6,1) forwards; }
@keyframes atk-pop { 0% { transform: scale(0.3); opacity: 0; } 50% { transform: scale(1.2); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
.fx-damage { color: #ff7050; }
.fx-heal   { color: #5ad070; }
.fx-shield { color: var(--freeze); }
.fx-burn   { color: var(--burn); }
.fx-poison { color: var(--poison); }
.fx-dot    { color: #e07050; font-size: 18px; }

/* ── 棋子网格（列数/行数由 inline style 动态注入）── */
.arena-grid {
  display: grid;
  gap: 6px;
  justify-content: center;
}
.empty-slot {
  background: rgba(0,0,0,.25);
  border: 1px dashed rgba(255,255,255,.10);
  border-radius: 6px;
  backdrop-filter: blur(2px);
}

/* ── 受击抖动（敌方插画 / 玩家区）── */
@keyframes elem-shake {
  0%, 100% { transform: translate(0, 0)       rotate(0deg) }
  20%      { transform: translate(-3px, 2px)  rotate(-0.5deg) }
  40%      { transform: translate(3px, -2px)  rotate(0.5deg) }
  60%      { transform: translate(-2px, 1px)  rotate(-0.3deg) }
  80%      { transform: translate(2px, -1px)  rotate(0.2deg) }
}
.enemy-portrait-wrap.elem-shake,
.player-section.elem-shake {
  animation: elem-shake 0.28s ease-out;
}
</style>
