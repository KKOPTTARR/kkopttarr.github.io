<template>
  <div class="app-wrap">

    <!-- ══════════════ 主界面 ══════════════ -->
    <HomeScreen v-if="phase === 'HOME'" @start="startGame" />

    <!-- ══════════════ 身份选择 ══════════════ -->
    <IdentityScreen v-else-if="phase === 'IDENTITY'" @choose="onIdentityChoice" />

    <!-- ══════════════ 战前预览（已停用，直接出发）══════════════ -->
    <template v-else-if="phase === 'PREVIEW'"></template>

    <!-- ══════════════ 战报 ══════════════ -->
    <ReportScreen
      v-else-if="phase === 'REPORT'"
      :result="resultType"
      :battle-count="battleCount"
      :wins="wins"
      :lives="lives"
      :max-lives="MAX_LIVES"
      :enemy-name="currentEnemy.name"
      :item-stats="battleItemStats"
      :reward-items="pendingRewards"
      @next="onResultNext"
    />

    <!-- ══════════════ 事件三选一 ══════════════ -->
    <EventScreen
      v-else-if="phase === 'EVENT'"
      :key="eventKey"
      :options="eventOptions"
      @choice="onEventChoice"
    />

    <!-- ══════════════ 以物换物选择 ══════════════ -->
    <ExchangeScreen
      v-else-if="phase === 'EXCHANGE'"
      :items="exchangeableItems"
      :lives="lives"
      :max-lives="MAX_LIVES"
      :battle-count="battleCount"
      :wins="wins"
      :gold="gold"
      @confirm="doExchange"
      @skip="afterEventAction"
    />

    <!-- ══════════════ 升级选择 ══════════════ -->
    <UpgradeScreen
      v-else-if="phase === 'UPGRADE'"
      :items="upgradeableItems"
      :lives="lives"
      :max-lives="MAX_LIVES"
      :battle-count="battleCount"
      :wins="wins"
      :gold="gold"
      :tag="upgradeEventTag"
      @upgrade="doUpgrade"
      @skip="afterEventAction"
    />


    <!-- ══════════════ 残骸搜寻 ══════════════ -->
    <WreckSearchScreen
      v-else-if="phase === 'WRECK_SEARCH'"
      :candidates="wreckCandidates"
      :lives="lives"
      :max-lives="MAX_LIVES"
      :battle-count="battleCount"
      :wins="wins"
      :gold="gold"
      @select="doWreckSelect"
      @skip="afterEventAction"
    />

    <!-- ══════════════ 变现 ══════════════ -->
    <CashOutScreen
      v-else-if="phase === 'CASH_OUT'"
      :items="cashOutItems"
      :lives="lives"
      :max-lives="MAX_LIVES"
      :battle-count="battleCount"
      :wins="wins"
      :gold="gold"
      @confirm="doCashOut"
      @skip="afterEventAction"
    />

    <!-- ══════════════ 炼金 ══════════════ -->
    <AlchemyScreen
      v-else-if="phase === 'ALCHEMY'"
      :items="alchemyBronzeItems"
      :lives="lives"
      :max-lives="MAX_LIVES"
      :battle-count="battleCount"
      :wins="wins"
      :gold="gold"
      @confirm="doAlchemyConfirm"
      @skip="afterEventAction"
    />

    <!-- ══════════════ 赌徒的骰子 ══════════════ -->
    <GamblerScreen
      v-else-if="phase === 'GAMBLER'"
      :items="gamblerItems"
      :lives="lives"
      :max-lives="MAX_LIVES"
      :battle-count="battleCount"
      :wins="wins"
      :gold="gold"
      @confirm="doGamblerDice"
      @skip="afterEventAction"
    />

    <!-- ══════════════ 敌人选择 ══════════════ -->
    <EnemySelectScreen
      v-else-if="phase === 'SELECT'"
      :enemies="selectEnemies"
      :lives="lives"
      :max-lives="MAX_LIVES"
      :battle-count="battleCount"
      :wins="wins"
      :gold="gold"
      @select="onEnemySelect"
    />

    <!-- ══════════════ 战斗模式 ══════════════ -->
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

    <!-- ══════════════ 整理阵容模式 ══════════════ -->
    <ArrangeScreen
      v-else-if="phase === 'ARRANGE'"
      :lives="lives"
      :max-lives="MAX_LIVES"
      :battle-count="battleCount"
      :wins="wins"
      :gold="gold"
      :player-items="playerItems"
      :backpack-items="backpackItems"
      :unlocked-cols="unlockedCols"
      :has-pending-events="pendingEvents > 0"
      @start-battle="onStartBattle"
      @continue="continueEventRound"
    />

    <!-- ══════════════ 商店模式 ══════════════ -->
    <ShopScreen
      v-else-if="phase === 'SHOP'"
      :lives="lives"
      :max-lives="MAX_LIVES"
      :battle-count="battleCount"
      :wins="wins"
      :gold="gold"
      :player-items="playerItems"
      :backpack-items="backpackItems"
      :shop-slots="shopSlots"
      :unlocked-cols="unlockedCols"
      v-model:showBackpack="showBackpack"
      @reroll="onReroll"
      @start-battle="onStartBattle"
    />

    <!-- 技能栏（8格横排，点击展开 tooltip） -->
    <div
      v-if="layoutState.skillBar"
      class="skill-bar"
    >
      <div class="skill-bar-label">— 技能 —</div>
      <div class="skill-bar-slots">
        <div
          v-for="i in 8" :key="i"
          class="skill-slot"
          :class="{ 'skill-slot--filled': i === 1 && identitySkill }"
          @click="i === 1 && identitySkill && (skillTooltipVisible = !skillTooltipVisible)"
        >
          <span v-if="i === 1 && identitySkill" class="skill-slot-icon">{{ identityIcon }}</span>
        </div>
      </div>
      <Teleport to="body">
        <div
          v-if="skillTooltipVisible && identitySkill"
          class="skill-tooltip"
          @click="skillTooltipVisible = false"
        >
          {{ identitySkill.desc }}
        </div>
      </Teleport>
    </div>

    <!-- 物品详情气泡 -->
    <ItemBubble :bubble="bubbleItem" @close="bubbleItem = null" />

    <!-- 升星提示（仅用于非合成消息，如空间已满） -->
    <Teleport to="body">
      <div v-if="mergeFlash" class="merge-toast">✨ {{ mergeFlash }}</div>
    </Teleport>

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
import ReportScreen        from './components/ReportScreen.vue'
import EventScreen         from './components/EventScreen.vue'
import IdentityScreen      from './components/IdentityScreen.vue'
import HomeScreen          from './components/HomeScreen.vue'
import ExchangeScreen      from './components/ExchangeScreen.vue'
import UpgradeScreen       from './components/UpgradeScreen.vue'
import WreckSearchScreen   from './components/WreckSearchScreen.vue'
import CashOutScreen       from './components/CashOutScreen.vue'
import AlchemyScreen       from './components/AlchemyScreen.vue'
import GamblerScreen       from './components/GamblerScreen.vue'
import BattleScreen        from './components/BattleScreen.vue'
import ShopScreen          from './components/ShopScreen.vue'
import ArrangeScreen       from './components/ArrangeScreen.vue'
import EnemySelectScreen   from './components/EnemySelectScreen.vue'
import ItemBubble          from './components/ItemBubble.vue'
import DragGhostOverlay    from './components/DragGhostOverlay.vue'
import MergeAnimOverlay    from './components/MergeAnimOverlay.vue'
import DiceAnimOverlay     from './components/DiceAnimOverlay.vue'
import BattleFlashOverlay  from './components/BattleFlashOverlay.vue'
import RewardAnimOverlay   from './components/RewardAnimOverlay.vue'
import { ITEM_POOL, findItem, getIconUrl } from './data/items.js'
import { findIdentity, getSelectEnemies } from './data/config.js'
import { TIER_LABELS } from './data/tiers.js'
import { useInventory, mkInst, GRID_COLS } from './composables/useInventory.js'
import GC from '../config/gameConfig.json'
import { useEventActions } from './composables/useEventActions.js'
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
import { shuffle } from './utils.js'

const { MAX_LIVES, GOLD_PER_DAY, SHOP_SLOTS } = GC

const {
  phase, battleCount, wins, lives, gold, resultType,
  mergeFlash,
  identitySkill, identityIcon, skillTooltipVisible, selectedIdentityName,
  battleSpeed, battleItemStats, selectedDifficulty,
  currentEnemy, selectEnemies,
  playerItems, backpackItems, enemyAbilities, shopSlots,
  playerStat, enemyStat,
  pendingRewards, showBackpack, battleScreenRef, bubbleItem,
  resetState,
} = useGameState()

const layoutState = reactive({ skillBar: false })
provide('layout', {
  set(opts)  { Object.assign(layoutState, opts) },
  reset()    { layoutState.skillBar = false },
})

const unlockedCols = computed(() => Math.min(2 + battleCount.value, GRID_COLS))

const {
  findFreeSlot, findFreeBackpackSlot,
  handleDropToGrid, handleDropToBackpack, handleDropToSell,
} = useInventory({ playerItems, backpackItems, shopSlots, gold, phase, unlockedCols, mergeFlash })

const { deliverRewards } = useRewards({ playerItems, backpackItems, findFreeSlot, findFreeBackpackSlot })

// ── 事件系统 ──────────────────────────────────────────────
const {
  eventKey, eventOptions, pendingEvents,
  stormBlessingActive, upgradeEventTag, wreckCandidates,
  afterEventAction, onEventChoice, startEventRound, continueEventRound, beginEventRound,
} = useEventSystem({
  phase, battleCount, playerItems, backpackItems,
  gold, mergeFlash, shopSlots, showBackpack,
  findFreeSlot, findFreeBackpackSlot, deliverRewards,
})

// ── 事件动作 ──────────────────────────────────────────────
const {
  doUpgrade, doExchange,
  doWreckSelect, doCashOut, doAlchemyConfirm, doGamblerDice,
  upgradeableItems, exchangeableItems,
  cashOutItems, alchemyBronzeItems, gamblerItems,
} = useEventActions({
  playerItems, backpackItems, gold, mergeFlash,
  findFreeSlot, findFreeBackpackSlot, mkInst,
  deliverRewards, playMergeAnimation, playDiceAnimation, afterEventAction,
  upgradeEventTag,
})

// ── 战斗流程 ──────────────────────────────────────────────
const { startActualBattle, onDeployComplete } = useBattleFlow({
  phase, playerStat, enemyStat, playerItems, enemyAbilities,
  battleItemStats, stormBlessingActive, battleScreenRef, unlockedCols,
  wins, lives, pendingRewards, selectedDifficulty, resultType,
  identitySkill, currentEnemy,
})

onMounted(() => {
  registerGlobalListeners()
  window.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('.item-card') && !e.target.closest('.shop-card') && !e.target.closest('.bubble')) {
      bubbleItem.value = null
    }
  }, { capture: true })
  setDragCallbacks({
    dropToGrid:      handleDropToGrid,
    dropToSell:      handleDropToSell,
    dropToBackpack:  handleDropToBackpack,
    clickItem: (item, cx, cy) => {
      if (bubbleItem.value?.item === item) {
        bubbleItem.value = null
      } else {
        bubbleItem.value = { item, x: cx, y: cy }
      }
    },
    formationLimits: () => ({ cols: unlockedCols.value, rows: 1 }),
  })
})

// ── 游戏流程 ──────────────────────────────────────────────

function startGame() {
  gold.value = GOLD_PER_DAY
  phase.value = 'IDENTITY'
}

function rollShop() {
  const p = [...ITEM_POOL]; shuffle(p)
  shopSlots.length = 0
  for (let i = 0; i < SHOP_SLOTS; i++) shopSlots.push(p[i] ?? null)
}
function onReroll() { if (gold.value < 1) return; gold.value--; rollShop() }

function onStartBattle() {
  if (phase.value !== 'SHOP' && phase.value !== 'ARRANGE') return
  cancelDrag()
  if (phase.value === 'SHOP') {
    showBackpack.value = false
    phase.value = 'ARRANGE'
    return
  }
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

async function onResultNext() {
  if (resultType.value === 'clear' || resultType.value === 'gameover') { resetGame(); return }
  battleCount.value++
  await deliverRewards(pendingRewards.value)
  pendingRewards.value = []
  startEventRound()
}

function onIdentityChoice(identityId) {
  const identity = findIdentity(identityId)
  if (!identity) return

  selectedIdentityName.value = identity.name
  identitySkill.value = identity.skill ?? null
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

function resetGame() {
  stopBattle()
  resetState()
  stormBlessingActive.value = false
  upgradeEventTag.value = null
  eventOptions.value = []
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
  height: 100vh; width: 100%; max-width: 600px; margin: 0 auto;
  overflow: hidden;
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
</style>
