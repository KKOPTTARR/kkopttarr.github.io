<template>
  <div class="app-wrap">

    <!-- ══════════════ Phase 路由（带淡入过渡）══════════════ -->
    <Transition name="page">
      <div :key="phase" class="phase-container">

        <!-- 主界面 -->
        <HomeScreen v-if="phase === 'HOME'" @start="startGame" />

        <!-- 身份选择 -->
        <IdentityScreen v-else-if="phase === 'IDENTITY'" @choose="onIdentityChoice" />

        <!-- BOSS 后技能选择 -->
        <SkillSelectScreen
          v-else-if="phase === 'SKILL_SELECT'"
          :candidates="skillCandidates"
          :chapter-number="completedChapterNum"
          :chapter-name="completedChapterName"
          @select="onSkillSelect"
        />

        <!-- 敌人选择 -->
        <EnemySelectScreen
          v-else-if="phase === 'SELECT'"
          :enemies="selectEnemies"
          :lives="lives"
          :max-lives="MAX_LIVES"
          :battle-count="battleCount"
          :wins="wins"
          @select="onEnemySelect"
        />

        <!-- 战斗模式 -->
        <BattleScreen
          v-else-if="phase === 'BATTLE'"
          ref="battleScreenRef"
          :player-stat="playerStat"
          :enemy-stat="enemyStat"
          :battle-speed="battleSpeed"
          :player-items="playerItems"
          :enemy-abilities="enemyAbilities"
          :current-enemy="currentEnemy"
          :latest-attack="latestAttack"
          :unlocked-cols="unlockedCols"
          :player-hit-class="playerHitClass"
          :enemy-hit-class="enemyHitClass"
          :selected-identity-name="selectedIdentityName"
          @speed-change="setSpeed"
          @deploy-complete="onDeployComplete"
        />

        <!-- 整理阵容（始终底层）-->
        <ArrangeScreen
          v-else-if="phase === 'ARRANGE'"
          :lives="lives"
          :max-lives="MAX_LIVES"
          :battle-count="battleCount"
          :player-items="playerItems"
          :backpack-items="backpackItems"
          :unlocked-cols="unlockedCols"
          :has-pending-events="pendingEvents > 0"
          :is-boss-next="isBossNext"
          @start-battle="onStartBattle"
          @continue="continueEventRound"
        />

      </div>
    </Transition>

    <!-- 技能栏（身份技能 + 章节技能横排，点击展开 tooltip） -->
    <div
      v-if="layoutState.skillBar"
      class="skill-bar"
    >
      <div class="skill-bar-label">— 技能 —</div>
      <div class="skill-bar-slots">
        <!-- 槽位 0：身份技能 -->
        <div
          class="skill-slot"
          :class="{ 'skill-slot--filled': !!identitySkill }"
          @click="identitySkill && (activeSkillTooltipIdx === -1 ? activeSkillTooltipIdx = -2 : activeSkillTooltipIdx = -1)"
        >
          <span v-if="identitySkill" class="skill-slot-icon">{{ identityIcon }}</span>
        </div>
        <!-- 章节技能槽位 -->
        <div
          v-for="(skill, idx) in activeSkills" :key="skill.id"
          class="skill-slot skill-slot--filled"
          @click="activeSkillTooltipIdx === idx ? activeSkillTooltipIdx = -1 : activeSkillTooltipIdx = idx"
        >
          <span class="skill-slot-icon">{{ getSkillIcon(skill) }}</span>
        </div>
        <!-- 空槽补位（最多显示 4 个章节技能槽） -->
        <div
          v-for="i in Math.max(0, 4 - activeSkills.length)" :key="'empty-' + i"
          class="skill-slot"
        />
      </div>
      <Teleport to="body">
        <!-- 身份技能 tooltip -->
        <div
          v-if="activeSkillTooltipIdx === -2 && identitySkill"
          class="skill-tooltip"
          @click="activeSkillTooltipIdx = -1"
        >
          <strong>{{ identitySkill.name_cn }}</strong><br>{{ identitySkillDesc }}
        </div>
        <!-- 章节技能 tooltip -->
        <div
          v-if="activeSkillTooltipIdx >= 0 && activeSkills[activeSkillTooltipIdx]"
          class="skill-tooltip"
          @click="activeSkillTooltipIdx = -1"
        >
          <strong>{{ activeSkills[activeSkillTooltipIdx].name_cn }}</strong> <span class="skill-tier">{{ activeSkills[activeSkillTooltipIdx].tier }}</span><br>{{ getSkillDesc(activeSkills[activeSkillTooltipIdx]) }}
        </div>
      </Teleport>
    </div>

    <!-- 物品详情气泡 -->
    <ItemBubble :bubble="bubbleItem" @close="hideBubble()" />

    <!-- 升星提示（仅用于非合成消息，如空间已满） -->
    <Teleport to="body">
      <div v-if="mergeFlash" class="merge-toast">✨ {{ mergeFlash }}</div>
    </Teleport>

    <!-- ══════════════ 章节开场 Overlay ══════════════ -->
    <ChapterOverlay
      :visible="showChapterOverlay"
      :chapter-num="overlayChapterNum"
      :chapter-name="overlayChapterName"

    />

    <!-- ══════════════ 事件浮层（叠在 ARRANGE 之上）══════════════ -->
    <Transition name="event-overlay">
      <EventScreen
        v-if="eventOverlay === 'EVENT'"
        :key="eventKey"
        :options="eventOptions"
        @choice="onEventChoice"
      />
    </Transition>
    <Transition name="event-overlay">
      <ExchangeScreen
        v-if="eventOverlay === 'EXCHANGE'"
        :items="exchangeableItems"
        :from-type="exchangeFromType"
        :to-type="exchangeToType"
        :lives="lives"
        :max-lives="MAX_LIVES"
        :battle-count="battleCount"
        @confirm="doExchange"
        @skip="afterEventAction"
      />
    </Transition>
    <Transition name="event-overlay">
      <UpgradeScreen
        v-if="eventOverlay === 'UPGRADE'"
        :items="upgradeableItems"
        :lives="lives"
        :max-lives="MAX_LIVES"
        :battle-count="battleCount"
        :tag="upgradeEventTag"
        @upgrade="doUpgrade"
        @skip="afterEventAction"
      />
    </Transition>
    <Transition name="event-overlay">
      <WreckSearchScreen
        v-if="eventOverlay === 'WRECK_SEARCH'"
        :candidates="wreckCandidates"
        :lives="lives"
        :max-lives="MAX_LIVES"
        :battle-count="battleCount"
        :inventory-full="inventoryFull"
        @select="doWreckSelect"
        @skip="afterEventAction"
      />
    </Transition>
    <Transition name="event-overlay">
      <AlchemyScreen
        v-if="eventOverlay === 'ALCHEMY'"
        :items="alchemyItems"
        :lives="lives"
        :max-lives="MAX_LIVES"
        :battle-count="battleCount"
        @confirm="doAlchemyConfirm"
        @skip="afterEventAction"
      />
    </Transition>
    <Transition name="event-overlay">
      <ShopEventScreen
        v-if="eventOverlay === 'SHOP_EVENT'"
        :candidates="shopCandidates"
        :lives="lives"
        :max-lives="MAX_LIVES"
        :battle-count="battleCount"
        :inventory-full="inventoryFull"
        @select="doShopSelect"
        @reroll="rerollShopCandidates"
        @skip="afterEventAction"
      />
    </Transition>
    <Transition name="event-overlay">
      <GamblerScreen
        v-if="eventOverlay === 'GAMBLER'"
        :lives="lives"
        :max-lives="MAX_LIVES"
        :battle-count="battleCount"
        @confirm="doGamblerDice"
        @skip="afterEventAction"
      />
    </Transition>
    <Transition name="event-overlay">
      <DeepAnchorScreen
        v-if="eventOverlay === 'DEEP_ANCHOR'"
        :items="[...playerItems, ...backpackItems]"
        :lives="lives"
        :max-lives="MAX_LIVES"
        :battle-count="battleCount"
        @confirm="doDeepAnchor"
        @skip="afterEventAction"
      />
    </Transition>
    <Transition name="event-overlay">
      <BreakBoatsScreen
        v-if="eventOverlay === 'BREAK_BOATS'"
        :player-items="playerItems"
        :lives="lives"
        :max-lives="MAX_LIVES"
        :battle-count="battleCount"
        @confirm="doBreakBoats"
        @skip="afterEventAction"
      />
    </Transition>
    <Transition name="event-overlay">
      <BlindTradeScreen
        v-if="eventOverlay === 'BLIND_TRADE'"
        :candidates="blindTradeCandidates"
        :lives="lives"
        :max-lives="MAX_LIVES"
        :battle-count="battleCount"
        :inventory-full="inventoryFull"
        @select="doBlindTradeSelect"
        @skip="afterEventAction"
      />
    </Transition>
    <Transition name="event-overlay">
      <TavernGambleScreen
        v-if="eventOverlay === 'TAVERN_GAMBLE'"
        :lives="lives"
        :max-lives="MAX_LIVES"
        :battle-count="battleCount"
        @confirm="doTavernGamble"
        @skip="afterEventAction"
      />
    </Transition>

    <!-- 全局 Overlay 组件 -->
    <DragGhostOverlay />
    <MergeAnimOverlay />
    <DiceAnimOverlay />
    <BattleFlashOverlay />
    <RewardAnimOverlay />

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, provide } from 'vue'
import EventScreen         from './components/EventScreen.vue'
import IdentityScreen      from './components/IdentityScreen.vue'
import HomeScreen          from './components/HomeScreen.vue'
import ExchangeScreen      from './components/ExchangeScreen.vue'
import UpgradeScreen       from './components/UpgradeScreen.vue'
import WreckSearchScreen   from './components/WreckSearchScreen.vue'
import AlchemyScreen       from './components/AlchemyScreen.vue'
import GamblerScreen       from './components/GamblerScreen.vue'
import ShopEventScreen     from './components/ShopEventScreen.vue'
import DeepAnchorScreen    from './components/DeepAnchorScreen.vue'
import BreakBoatsScreen    from './components/BreakBoatsScreen.vue'
import BlindTradeScreen    from './components/BlindTradeScreen.vue'
import TavernGambleScreen  from './components/TavernGambleScreen.vue'
import SkillSelectScreen   from './components/SkillSelectScreen.vue'
import ChapterOverlay      from './components/ChapterOverlay.vue'
import BattleScreen        from './components/BattleScreen.vue'
import ArrangeScreen       from './components/ArrangeScreen.vue'
import EnemySelectScreen   from './components/EnemySelectScreen.vue'
import ItemBubble          from './components/ItemBubble.vue'
import DragGhostOverlay    from './components/DragGhostOverlay.vue'
import MergeAnimOverlay    from './components/MergeAnimOverlay.vue'
import DiceAnimOverlay     from './components/DiceAnimOverlay.vue'
import BattleFlashOverlay  from './components/BattleFlashOverlay.vue'
import RewardAnimOverlay   from './components/RewardAnimOverlay.vue'
import { ITEM_POOL, findItem, getIconUrl } from './data/items.js'
import { findIdentity, getSelectEnemies, EVENT_POOL } from './data/config.js'
import { TIER_LABELS } from './data/tiers.js'
import { useInventory, mkInst, GRID_COLS } from './composables/useInventory.js'
import GC from '../config/gameConfig.json'
import { useEventActions } from './composables/useEventActions.js'
import { isBossBattle, getChapterNumber, getChapterInfo, SKILL_POOL } from './composables/useSkills.js'
const EVENT_LABEL_MAP = Object.fromEntries(EVENT_POOL.map(e => [e.id, e.label]))
import { useEventSystem } from './composables/useEventSystem.js'
import { playMergeAnimation } from './composables/useMergeAnim.js'
import { playDiceAnimation } from './composables/useDiceAnim.js'
import { rewardAnim, useRewards } from './composables/useRewards.js'
import {
  latestAttack,
  playerHitClass, enemyHitClass,
  useBattleFlow,
} from './composables/useBattleFlow.js'
import { dragState, setDragCallbacks, registerGlobalListeners, cancelDrag } from './composables/useDrag.js'
import { stopBattle, setBattleSpeed } from './composables/useBattle.js'
import { setPixiSpeed } from './composables/usePixiBattle.js'
import { useGameState } from './composables/useGameState.js'
import { bubbleItem, hideBubble } from './composables/useBubble.js'
import { shuffle, sleep } from './utils.js'

const { MAX_LIVES } = GC

const {
  phase, battleCount, wins, lives, resultType,
  mergeFlash,
  identitySkill, identityIcon, skillTooltipVisible, selectedIdentityName,
  battleSpeed, battleItemStats, selectedDifficulty,
  currentEnemy, selectEnemies,
  playerItems, backpackItems, enemyAbilities,
  playerStat, enemyStat,
  activeSkills,
  pendingRewards, showBackpack, battleScreenRef,
  resetState,
} = useGameState()

const skillCandidates      = ref([])
const chapterNumber        = computed(() => getChapterNumber(battleCount.value))
const chapterInfo          = computed(() => getChapterInfo(battleCount.value))
// 技能选择时 battleCount 已 +1，需要用 battleCount-1 获取刚通过的章节
const completedChapterNum  = computed(() => getChapterNumber(Math.max(0, battleCount.value - 1)))
const completedChapterName = computed(() => getChapterInfo(Math.max(0, battleCount.value - 1))?.name ?? '')
const isBossNext           = computed(() => isBossBattle(battleCount.value))
const showChapterOverlay   = ref(false)
const overlayChapterNum    = ref(1)
const overlayChapterName   = ref('')

const layoutState = reactive({ skillBar: false })
provide('layout', {
  set(opts)  { Object.assign(layoutState, opts) },
  reset()    { layoutState.skillBar = false },
})

const unlockedCols = computed(() => Math.min(2 + battleCount.value, GRID_COLS))

const {
  findFreeSlot, findFreeBackpackSlot,
  handleDropToGrid, handleDropToBackpack, handleDropToSell,
} = useInventory({ playerItems, backpackItems, phase, unlockedCols, mergeFlash })

const inventoryFull = computed(() => !findFreeSlot() && !findFreeBackpackSlot())

const { deliverRewards } = useRewards({ playerItems, backpackItems, findFreeSlot, findFreeBackpackSlot })

// ── 事件系统 ──────────────────────────────────────────────
const {
  eventKey, eventOptions, eventOverlay, pendingEvents,
  stormBlessingActive, stormShieldAmount, breakBoatsBuff,
  upgradeEventTag, exchangeFromType, exchangeToType,
  wreckCandidates, shopCandidates, blindTradeCandidates,
  afterEventAction, onEventChoice, rerollShopCandidates,
  startEventRound, continueEventRound, beginEventRound,
} = useEventSystem({
  phase, battleCount, playerItems, backpackItems,
  mergeFlash, showBackpack,
  findFreeSlot, findFreeBackpackSlot, deliverRewards,
})

// ── 事件动作 ──────────────────────────────────────────────
const {
  doUpgrade, doExchange,
  doWreckSelect, doAlchemyConfirm, doGamblerDice, doShopSelect,
  doDeepAnchor, doBreakBoats, doBlindTradeSelect, doTavernGamble,
  upgradeableItems, exchangeableItems, alchemyItems,
} = useEventActions({
  playerItems, backpackItems, mergeFlash,
  findFreeSlot, findFreeBackpackSlot, mkInst,
  deliverRewards, playMergeAnimation, playDiceAnimation, afterEventAction,
  upgradeEventTag, breakBoatsBuff,
  lives, maxLives: MAX_LIVES,
  exchangeFromType, exchangeToType,
})

// ── 战斗流程 ──────────────────────────────────────────────
const { startActualBattle, onDeployComplete } = useBattleFlow({
  phase, playerStat, enemyStat, playerItems, enemyAbilities,
  battleItemStats, stormBlessingActive, stormShieldAmount, breakBoatsBuff, battleScreenRef, unlockedCols,
  wins, lives, selectedDifficulty, resultType,
  identitySkill, currentEnemy, activeSkills, battleCount,
  skillCandidates,
  deliverRewards,
  afterBattleComplete,
})

onMounted(() => {
  registerGlobalListeners()
  window.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('.item-card') && !e.target.closest('.shop-card') && !e.target.closest('.bubble')) {
      hideBubble()
    }
  }, { capture: true })
  setDragCallbacks({
    dropToGrid:      handleDropToGrid,
    dropToSell:      handleDropToSell,
    dropToBackpack:  handleDropToBackpack,
    formationLimits: () => ({ cols: unlockedCols.value, rows: 1 }),
  })
})

// ── 身份技能描述 ──────────────────────────────────────────
const identitySkillDesc = computed(() => {
  if (!identitySkill.value) return ''
  const base = SKILL_POOL.find(s => s.id === identitySkill.value.id)
  if (!base) return ''
  const val = base.tiers?.[identitySkill.value.tier]?.value ?? ''
  return base.desc_cn.replace('{value}', val)
})

const activeSkillTooltipIdx = ref(-1)

function getSkillIcon(skill) {
  const base = SKILL_POOL.find(s => s.id === skill.id)
  return base?.icon ?? '❓'
}

function getSkillDesc(skill) {
  const base = SKILL_POOL.find(s => s.id === skill.id)
  if (!base) return ''
  const val = base.tiers?.[skill.tier]?.value ?? ''
  return base.desc_cn.replace('{value}', val)
}

// ── 游戏流程 ──────────────────────────────────────────────

async function startGame() {
  const info = getChapterInfo(battleCount.value)
  if (info) {
    overlayChapterNum.value  = getChapterNumber(battleCount.value)
    overlayChapterName.value = info.name
    showChapterOverlay.value = true
    await sleep(1800)
    showChapterOverlay.value = false
    await sleep(300)
  }
  phase.value = 'IDENTITY'
}

function onStartBattle() {
  if (phase.value !== 'ARRANGE') return
  cancelDrag()
  selectEnemies.value = getSelectEnemies(battleCount.value)
  phase.value = 'SELECT'
}

function onEnemySelect(enemy) {
  selectedDifficulty.value = enemy.difficulty
  currentEnemy.value = enemy
  enemyStat.maxHp = enemy.hp; enemyStat.hp = enemy.hp; enemyStat.shield = 0
  enemyStat.burnStacks = 0; enemyStat.poisonStacks = 0
  enemyAbilities.length = 0
  for (const ab of enemy.abilities) {
    enemyAbilities.push(reactive({ ...ab, cooldownProgress: 0, triggering: false }))
  }
  startActualBattle()
}

async function afterBattleComplete(isBoss) {
  if (resultType.value === 'gameover') { resetGame(); return }
  if (isBoss && skillCandidates.value.length > 0) {
    phase.value = 'SKILL_SELECT'
  } else {
    startEventRound()
  }
}

async function onSkillSelect(skill) {
  activeSkills.push({ ...skill, _used: false })
  skillCandidates.value = []
  // 章节切换提示：battleCount 已 +1，指向新章节
  const info = getChapterInfo(battleCount.value)
  if (info) {
    overlayChapterNum.value  = getChapterNumber(battleCount.value)
    overlayChapterName.value = info.name
    showChapterOverlay.value = true
    await sleep(1800)
    showChapterOverlay.value = false
    await sleep(300)
  }
  startEventRound()
}

function resetGame() {
  stopBattle()
  resetState()
  stormBlessingActive.value = false
  stormShieldAmount.value = 0
  breakBoatsBuff.value = null
  upgradeEventTag.value = null
  eventOptions.value = []
  skillCandidates.value = []
}

function onIdentityChoice(identityId) {
  const identity = findIdentity(identityId)
  if (!identity) return

  selectedIdentityName.value = identity.name
  identitySkill.value = identity.skillId
    ? { id: identity.skillId, tier: identity.skillTier ?? 'Bronze' }
    : null
  identityIcon.value = identity.icon ?? ''

  // 1件固定道具 + 2件随机同tag道具
  const fixedItem = (identity.startItems || []).map(id => findItem(id)).filter(Boolean)[0] ?? null
  const tagPool = identity.startTag
    ? (() => { const p = ITEM_POOL.filter(i => i.tags?.includes(identity.startTag) && i.id !== fixedItem?.id); shuffle(p); return p.slice(0, 2) })()
    : []
  const itemsToGive = [fixedItem, ...tagPool].filter(Boolean)

  for (const item of itemsToGive) {
    const fs = findFreeSlot()
    if (fs) {
      playerItems.push(mkInst(item, fs.col, fs.row))
    } else {
      const bps = findFreeBackpackSlot()
      if (bps) backpackItems.push(mkInst(item, bps.col, bps.row))
    }
  }

  showBackpack.value = false
  beginEventRound()
}


function setSpeed(s) {
  battleSpeed.value = s
  setBattleSpeed(s)
  setPixiSpeed(s)
}
</script>

<style scoped>
.app-wrap {
  position: relative;
  display: flex; flex-direction: column;
  height: 100dvh; width: 100%; max-width: 600px; margin: 0 auto;
  overflow: hidden;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

/* ── Phase 容器（充满父级）── */
.phase-container {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
}

/* ── Phase 切换淡入淡出 ── */
.page-enter-active {
  transition: opacity .25s ease-out;
  will-change: opacity;
}
.page-leave-active {
  transition: opacity .2s ease-in;
  will-change: opacity;
  position: absolute;
  inset: 0;
}
.page-enter-from,
.page-leave-to {
  opacity: 0;
}

.skill-bar {
  position: absolute;
  bottom: 52px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  z-index: 10;
}

.skill-bar-label {
  font-size: 11px;
  color: #f0c040;
  letter-spacing: 2px;
  text-shadow: 0 1px 6px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.6);
}

.skill-bar-slots {
  display: flex;
  gap: 6px;
}

.skill-slot {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid rgba(120, 80, 30, 0.4);
  background: rgba(8, 5, 1, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
}

.skill-slot--filled {
  border-color: rgba(180, 130, 50, 0.7);
  background: rgba(20, 12, 4, 0.75);
  cursor: pointer;
}
.skill-slot--filled:hover {
  border-color: #c8a060;
}

.skill-slot-icon { font-size: 18px; line-height: 1; }

.skill-tier {
  font-size: 11px;
  color: #f0c040;
  margin-left: 4px;
}

.skill-tooltip {
  position: fixed;
  bottom: 58px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(10, 6, 2, 0.92);
  border: 1px solid rgba(180, 130, 50, 0.5);
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 12px;
  color: #e0c080;
  white-space: nowrap;
  z-index: 100;
  pointer-events: auto;
  cursor: pointer;
}

/* ── 事件浮层过渡动画 ── */
.event-overlay-enter-active {
  transition: opacity .35s ease-out;
  will-change: opacity;
}
.event-overlay-leave-active {
  transition: opacity .2s ease-in;
  will-change: opacity;
}
.event-overlay-enter-from,
.event-overlay-leave-to {
  opacity: 0;
}
</style>
