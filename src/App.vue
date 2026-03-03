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
      :enemy-name="currentEnemy.name"
      :item-stats="battleItemStats"
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
      @skip="skipExchange"
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
      @skip="skipUpgrade"
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
      v-model:showBackpack="showBackpack"
      @start-battle="onStartBattle"
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

    <!-- 拖拽 Ghost -->
    <Teleport to="body">
      <div v-if="dragState.active" class="drag-ghost"
        :style="{ left: dragState.ghostX+'px', top: dragState.ghostY+'px',
                  width: dragState.ghostW+'px', height: dragState.ghostH+'px' }"
      >
        <ItemCard v-if="dragState.item" :item="dragState.item"
          :grid-col="0" :grid-row="0" :cell-size="58" :cell-gap="4"
          :is-enemy="false" :shop-mode="true"
          style="position:relative;width:100%;height:100%;left:0;top:0;" />
      </div>
    </Teleport>

    <!-- Tooltip -->
    <Teleport to="body">
      <div id="item-tooltip" class="tooltip hidden">
        <div class="tt-name"></div>
        <div class="tt-tags"></div>
        <div class="tt-stats"></div>
        <div class="tt-skill"></div>
      </div>
    </Teleport>

    <!-- 升星提示（仅用于非合成消息，如空间已满） -->
    <Teleport to="body">
      <div v-if="mergeFlash" class="merge-toast">✨ {{ mergeFlash }}</div>
    </Teleport>

    <!-- 合成动画 overlay -->
    <Teleport to="body">
      <div v-if="mergeAnim.active" class="merge-anim-overlay">
        <div class="merge-anim-stage">
          <div class="merge-glow-ring" :class="`merge-glow-${mergeAnim.tier}`"></div>
          <div class="merge-anim-card" :class="mergeAnim.cardClass">
            <img :src="mergeAnim.imgUrl" class="merge-anim-img" draggable="false" />
            <div class="merge-anim-tier-pill" :class="`merge-tier-${mergeAnim.tier}`">
              {{ ANIM_TIER_LABELS[mergeAnim.tier] }}
            </div>
          </div>
        </div>
        <div v-if="mergeAnim.label" class="merge-anim-label">{{ mergeAnim.label }}</div>
      </div>
    </Teleport>

    <!-- 战斗开场特效 -->
    <Teleport to="body">
      <div v-if="battleFlash" class="battle-flash-overlay">
        <div class="flash-swords">⚔️</div>
        <div class="flash-shockwave"></div>
      </div>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import ItemCard       from './components/ItemCard.vue'
import ReportScreen   from './components/ReportScreen.vue'
import EventScreen    from './components/EventScreen.vue'
import IdentityScreen from './components/IdentityScreen.vue'
import HomeScreen     from './components/HomeScreen.vue'
import ExchangeScreen from './components/ExchangeScreen.vue'
import UpgradeScreen  from './components/UpgradeScreen.vue'
import BattleScreen   from './components/BattleScreen.vue'
import ShopScreen     from './components/ShopScreen.vue'
import ArrangeScreen  from './components/ArrangeScreen.vue'
import { ITEM_POOL, findItem, canPlace, getIconUrl } from './data/items.js'
import { findIdentity, getEnemyByBattle, EVENT_POOL } from './data/config.js'
import { dragState, setDragCallbacks, registerGlobalListeners, cancelDrag } from './composables/useDrag.js'
import { showItemTooltip, hideItemTooltip } from './composables/useTooltip.js'
import { startBattle, stopBattle, setBattleSpeed } from './composables/useBattle.js'
import { setPixiSpeed } from './composables/usePixiBattle.js'

const MAX_LIVES    = 2
const GOLD_PER_DAY = 20
let ic = 0
const newId = () => `i${++ic}`

const phase       = ref('HOME')
const battleCount = ref(0)
const nodeType    = ref('normal')
const wins        = ref(0)
const lives       = ref(MAX_LIVES)
const gold        = ref(GOLD_PER_DAY)
const resultType      = ref('win')
const battleFlash     = ref(false)
const mergeFlash      = ref('')

// ── 合成动画状态 ──────────────────────────────────────────
const ANIM_TIER_LABELS = { Bronze: '铜', Silver: '银', Gold: '金', Diamond: '钻' }
const mergeAnim = reactive({ active: false, imgUrl: '', tier: '', cardClass: '', label: '' })
let _mergeTimers = []
const battleSpeed     = ref(1)
const battleItemStats = ref([])
const selectedIdentityName = ref('')

const playerStat     = reactive({ hp: 500, maxHp: 500, shield: 0, burnStacks: 0, poisonStacks: 0 })
const enemyStat      = reactive({ hp: 200, maxHp: 200, shield: 0, burnStacks: 0, poisonStacks: 0 })
const playerItems    = reactive([])
const backpackItems  = reactive([])
const enemyAbilities = reactive([])
const shopSlots      = reactive([])
const currentEnemy   = ref(getEnemyByBattle(0))
const showBackpack   = ref(false)
const pendingEvents       = ref(0)
const eventKey            = ref(0)
const eventOptions        = ref([])
const stormBlessingActive = ref(false)
const upgradeEventTag     = ref(null)
const exchangeTargetItem  = ref(null)

const battleScreenRef = ref(null)  // BattleScreen 组件引用

const latestAttack  = ref(null)
const playerHitType = ref(null)
const enemyHitType  = ref(null)
const playerHitClass = computed(() => playerHitType.value ? `hit-${playerHitType.value}` : '')
const enemyHitClass  = computed(() => enemyHitType.value  ? `hit-${enemyHitType.value}`  : '')

// 阵容：1行×最多5列，随 battleCount 逐步解锁
const GRID_ROWS = 1, GRID_COLS = 5
const unlockedCols = computed(() => Math.min(2 + battleCount.value, 5))
function emptyGrid() { return [Array(GRID_COLS).fill(null)] }

function buildGridState(items) {
  const s = emptyGrid()
  for (const item of items) {
    const c = item.col
    if (c >= 0 && c < GRID_COLS) s[0][c] = item.instanceId
  }
  return s
}

// 背包：固定 2行×4列
const BP_ROWS = 2, BP_COLS = 4
function buildBackpackGridState() {
  const s = Array.from({ length: BP_ROWS }, () => Array(BP_COLS).fill(null))
  for (const item of backpackItems) {
    const r = item.row ?? 0, c = item.col
    if (r >= 0 && r < BP_ROWS && c >= 0 && c < BP_COLS) s[r][c] = item.instanceId
  }
  return s
}

onMounted(() => {
  registerGlobalListeners()
  window.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('.item-card') && !e.target.closest('.shop-card')) {
      hideItemTooltip()
    }
  }, { capture: true })
  setDragCallbacks({
    dropToGrid:       handleDropToGrid,
    dropToSell:       handleDropToSell,
    dropToBackpack:   handleDropToBackpack,
    gridState:        () => buildGridState(playerItems),
    backpackGridState:() => buildBackpackGridState(),
    clickItem:        (item, x, y) => showItemTooltip(item, x, y),
    formationLimits:  () => ({ cols: unlockedCols.value, rows: 1 }),
  })
})

function startGame() {
  gold.value = GOLD_PER_DAY
  loadEnemy()
  phase.value = 'IDENTITY'
}

function initShop() { gold.value = GOLD_PER_DAY; rollShop() }
function rollShop() {
  const p = [...ITEM_POOL]; shuffle(p)
  shopSlots.length = 0
  for (let i = 0; i < 3; i++) shopSlots.push(p[i] ?? null)
}
function onReroll() { if (gold.value < 1) return; gold.value--; rollShop() }

function loadEnemy() {
  currentEnemy.value = getEnemyByBattle(battleCount.value)
  const baseHp = currentEnemy.value.hp
  const hp = nodeType.value === 'elite' ? Math.round(baseHp * 1.5) : baseHp
  enemyStat.maxHp = hp; enemyStat.hp = hp; enemyStat.shield = 0
  enemyStat.burnStacks = 0; enemyStat.poisonStacks = 0
  enemyAbilities.length = 0
  for (const ab of currentEnemy.value.abilities) {
    enemyAbilities.push(reactive({ ...ab, cooldownProgress: 0, triggering: false }))
  }
}

function mkInst(base, col, row) {
  return reactive({ ...base, instanceId: newId(), col, row,
    stack: 1,
    cooldownProgress: 0, burnStacks: 0, poisonStacks: 0,
    triggering: false })
}

// ── 查找可堆叠的同款物品（同 id + 同 tier）──
function findStackable(item) {
  return playerItems.find(i => i.id === item.id && i.tier === item.tier && i.stack < 2)
    ?? backpackItems.find(i => i.id === item.id && i.tier === item.tier && i.stack < 2)
    ?? null
}

// ── 购买时：优先堆叠 → 上阵区 → 背包 ──────────────────
function tryBuyItem(item, shopSlot) {
  if ((phase.value !== 'SHOP' && phase.value !== 'ARRANGE') || gold.value < item.price) return false
  const existing = findStackable(item)
  if (existing) {
    gold.value -= item.price
    if (shopSlot >= 0) shopSlots[shopSlot] = null
    incrementStack(existing)
    return true
  }
  const fs = findFreeSlot()
  if (fs) {
    gold.value -= item.price
    if (shopSlot >= 0) shopSlots[shopSlot] = null
    playerItems.push(mkInst(item, fs.col, fs.row))
    return true
  }
  const bps = findFreeBackpackSlot()
  if (bps) {
    gold.value -= item.price
    if (shopSlot >= 0) shopSlots[shopSlot] = null
    backpackItems.push(mkInst(item, bps.col, bps.row))
    return true
  }
  mergeFlash.value = '空间已满！'
  setTimeout(() => { mergeFlash.value = '' }, 1500)
  return false
}

// ── 堆叠计数 + 升级逻辑 ──────────────────────────────────
function incrementStack(inst) {
  inst.stack = (inst.stack || 1) + 1
  if (inst.stack >= 2) {
    const nextTier  = TIER_ORDER[TIER_ORDER.indexOf(inst.tier) + 1]
    if (nextTier) {
      const base      = findItem(inst.id)
      const tierStats = base?.tiers?.[nextTier]
      if (tierStats) playMergeAnimation(inst, inst.tier, nextTier, base, tierStats)
    } else {
      inst.stack = 1
    }
  }
}

// ── 合成动画（约 3.5s）────────────────────────────────────
function playMergeAnimation(inst, fromTier, toTier, base, tierStats, onComplete) {
  _mergeTimers.forEach(t => clearTimeout(t))
  _mergeTimers = []

  Object.assign(mergeAnim, {
    active: true,
    imgUrl: getIconUrl(base.name_en, fromTier),
    tier: fromTier,
    cardClass: 'ma-enter',
    label: '',
  })

  function at(ms, fn) { _mergeTimers.push(setTimeout(fn, ms)) }

  at(450,  () => { mergeAnim.cardClass = '' })
  at(650,  () => { mergeAnim.cardClass = 'ma-shake' })
  at(1000, () => { mergeAnim.cardClass = '' })
  at(1080, () => { mergeAnim.cardClass = 'ma-shake' })
  at(1430, () => { mergeAnim.cardClass = '' })
  at(1550, () => { mergeAnim.cardClass = 'ma-flip-out' })
  at(1800, () => {
    mergeAnim.imgUrl = getIconUrl(base.name_en, toTier)
    mergeAnim.tier   = toTier
    inst.tier = toTier
    Object.assign(inst, tierStats)
    inst.stack = 1
  })
  at(1800, () => { mergeAnim.cardClass = 'ma-flip-in' })
  at(2050, () => {
    mergeAnim.cardClass = ''
    mergeAnim.label = `${base.name_cn} 升级为 ${nextTierLabel(toTier)} ！`
  })
  at(2500, () => { mergeAnim.cardClass = 'ma-exit' })
  at(3000, () => {
    mergeAnim.active = false
    mergeAnim.cardClass = ''
    mergeAnim.label = ''
    onComplete?.()
  })
}

function handleDropToGrid(item, col, row, sourceType, sourceInstanceId, sourceShopSlot) {
  if (phase.value !== 'SHOP' && phase.value !== 'ARRANGE') return
  if (sourceType === 'grid') {
    const idx = playerItems.findIndex(i => i.instanceId === sourceInstanceId)
    if (idx !== -1) playerItems.splice(idx, 1)
    if (!canPlace(buildGridState(playerItems), col, row, unlockedCols.value, 1)) {
      const inst = mkInst(item, item.col, item.row)
      inst.instanceId = sourceInstanceId
      inst.stack = item.stack ?? 1
      playerItems.push(inst)
    } else {
      const inst = mkInst(item, col, row)
      inst.instanceId = sourceInstanceId
      inst.stack = item.stack ?? 1
      playerItems.push(inst)
    }
  } else if (sourceType === 'backpack') {
    const idx = backpackItems.findIndex(i => i.instanceId === sourceInstanceId)
    if (idx === -1) return
    if (!canPlace(buildGridState(playerItems), col, row, unlockedCols.value, 1)) return
    backpackItems.splice(idx, 1)
    const inst = mkInst(item, col, row)
    inst.instanceId = sourceInstanceId
    inst.stack = item.stack ?? 1
    playerItems.push(inst)
  } else {
    tryBuyItem(item, sourceShopSlot)
  }
}

function handleDropToBackpack(item, col, row, sourceType, sourceInstanceId, sourceShopSlot) {
  if (phase.value !== 'SHOP' && phase.value !== 'ARRANGE') return
  if (sourceType === 'grid') {
    const idx = playerItems.findIndex(i => i.instanceId === sourceInstanceId)
    if (idx === -1) return
    if (!canPlace(buildBackpackGridState(), col, row)) return
    playerItems.splice(idx, 1)
    const inst = mkInst(item, col, row)
    inst.instanceId = sourceInstanceId
    inst.stack = item.stack ?? 1
    backpackItems.push(inst)
  } else if (sourceType === 'backpack') {
    const idx = backpackItems.findIndex(i => i.instanceId === sourceInstanceId)
    if (idx === -1) return
    backpackItems.splice(idx, 1)
    if (!canPlace(buildBackpackGridState(), col, row)) {
      const inst = mkInst(item, item.col, item.row)
      inst.instanceId = sourceInstanceId
      inst.stack = item.stack ?? 1
      backpackItems.push(inst)
    } else {
      const inst = mkInst(item, col, row)
      inst.instanceId = sourceInstanceId
      inst.stack = item.stack ?? 1
      backpackItems.push(inst)
    }
  } else if (sourceType === 'shop') {
    tryBuyItem(item, sourceShopSlot)
  }
}

function handleDropToSell(instanceId) {
  if (phase.value !== 'SHOP' && phase.value !== 'ARRANGE') return
  let idx = playerItems.findIndex(i => i.instanceId === instanceId)
  if (idx !== -1) { playerItems.splice(idx, 1); gold.value++; return }
  idx = backpackItems.findIndex(i => i.instanceId === instanceId)
  if (idx !== -1) { backpackItems.splice(idx, 1); gold.value++ }
}

function findFreeSlot() {
  const state = buildGridState(playerItems)
  for (let c = 0; c < unlockedCols.value; c++)
    if (canPlace(state, c, 0, unlockedCols.value, 1)) return { col: c, row: 0 }
  return null
}

function findFreeBackpackSlot() {
  const state = buildBackpackGridState()
  for (let r = 0; r < BP_ROWS; r++)
    for (let c = 0; c < BP_COLS; c++)
      if (canPlace(state, c, r)) return { col: c, row: r }
  return null
}

// ── 品级配置 ─────────────────────────────────────────────
const TIER_ORDER = ['Bronze', 'Silver', 'Gold', 'Diamond']

function nextTierLabel(t) {
  const map = { Silver: '⭐白银', Gold: '⭐⭐黄金', Diamond: '⭐⭐⭐钻石' }
  return map[t] || t
}

function nextTierOf(tier) {
  return TIER_ORDER[TIER_ORDER.indexOf(tier) + 1] ?? tier
}

// 商店 / 整理阵容"出发"→ 直接开始战斗
function onStartBattle() {
  if (phase.value !== 'SHOP' && phase.value !== 'ARRANGE') return
  cancelDrag()
  startActualBattle()
}

async function startActualBattle() {
  const srcRects = captureSourceRects()

  battleFlash.value = true
  await sleep(600)
  battleFlash.value = false

  phase.value = 'BATTLE'
  playerStat.hp = playerStat.maxHp; playerStat.shield = 0
  playerStat.burnStacks = 0; playerStat.poisonStacks = 0
  enemyStat.hp = enemyStat.maxHp; enemyStat.shield = 0
  enemyStat.burnStacks = 0; enemyStat.poisonStacks = 0
  battleItemStats.value = []
  if (stormBlessingActive.value) {
    playerStat.shield = 50
    stormBlessingActive.value = false
  }

  await nextTick()
  await new Promise(r => requestAnimationFrame(r))

  const dstRects = captureDestRects()
  battleScreenRef.value?.startDeploy(srcRects, dstRects)
}

function onDeployComplete() {
  battleScreenRef.value?.onBattleStart()
  startBattle(playerItems, enemyAbilities, playerStat, enemyStat, {
    onHpChange:  handleHpChange,
    onBattleEnd: handleBattleEnd,
    onAttack:    (info) => { latestAttack.value = { ...info, _t: Date.now() } },
  })
}

function captureSourceRects() {
  const rects = {}
  const CELL = 88, GAP = 4
  const _calc = (containerEl, items) => {
    if (!containerEl) return
    const cr = containerEl.getBoundingClientRect()
    for (const item of items) {
      rects[item.instanceId] = { left: cr.left + item.col * (CELL + GAP), top: cr.top, width: CELL, height: CELL }
    }
  }
  _calc(
    document.querySelector('.player-section .grid-container') ||
    document.querySelector('.formation-panel .grid-container'),
    playerItems
  )
  return rects
}

function captureDestRects() {
  const rects = {}
  const GAP = 4
  const _calc = (gridEl, items) => {
    if (!gridEl) return
    const cr   = gridEl.getBoundingClientRect()
    const uc   = unlockedCols.value
    const colW = (cr.width - (uc - 1) * GAP) / uc
    for (const item of items) {
      rects[item.instanceId] = { left: cr.left + item.col * (colW + GAP), top: cr.top, width: colW, height: cr.height }
    }
  }
  _calc(document.querySelector('.player-section .arena-grid'), playerItems)
  return rects
}

function handleHpChange(who, hp, shield, changeType = 'damage') {
  if (who === 'player') {
    playerStat.hp = hp; playerStat.shield = shield
    playerHitType.value = changeType
    setTimeout(() => { playerHitType.value = null }, 460)
  } else {
    enemyStat.hp = hp; enemyStat.shield = shield
    enemyHitType.value = changeType
    setTimeout(() => { enemyHitType.value = null }, 460)
  }
}

function handleBattleEnd(result, stats = []) {
  stopBattle()
  battleItemStats.value = stats
  if (result === 'win') {
    wins.value++
    resultType.value = wins.value >= 5 ? 'clear' : 'win'
  } else {
    lives.value--
    gold.value += 3
    resultType.value = lives.value <= 0 ? 'gameover' : 'lose'
  }
  phase.value = 'REPORT'
}
const BATTLE_REWARD = 5

function onResultNext() {
  if (resultType.value === 'clear' || resultType.value === 'gameover') { resetGame(); return }
  battleCount.value++
  gold.value += BATTLE_REWARD
  pendingEvents.value = 2
  prepareEventOptions()
  eventKey.value++
  phase.value = 'EVENT'
}

function onIdentityChoice(identityId) {
  const identity = findIdentity(identityId)
  if (!identity) return

  selectedIdentityName.value = identity.name
  if (identity.startGold) gold.value += identity.startGold

  const itemsToGive = identity.startTag
    ? (() => { const p = ITEM_POOL.filter(i => i.tags?.includes(identity.startTag)); shuffle(p); return p.slice(0, 1) })()
    : (identity.startItems || []).map(id => findItem(id)).filter(Boolean)

  for (const item of itemsToGive) {
    const fs = findFreeSlot()
    if (fs) {
      playerItems.push(mkInst(item, fs.col, fs.row))
    } else {
      const bps = findFreeBackpackSlot()
      if (bps) backpackItems.push(mkInst(item, bps.col, bps.row))
    }
  }

  rollShop()
  showBackpack.value = false
  eventOptions.value = [{
    id: 'shop',
    icon: '🏪',
    label: '前往商店',
    desc: '港口的消息说前方有市集，补给后再出发',
  }]
  eventKey.value++
  phase.value = 'EVENT'
}

function onEventChoice(eventId) {
  pendingEvents.value--

  if (eventId === 'upgrade') {
    phase.value = 'UPGRADE'
    return
  }
  if (eventId === 'shop') {
    showBackpack.value = false
    pendingEvents.value = 0
    loadEnemy()
    phase.value = 'SHOP'
    return
  }
  if (eventId === 'exchange') {
    phase.value = 'EXCHANGE'
    return
  }
  if (eventId === 'storm_blessing') {
    stormBlessingActive.value = true
    afterEventAction()
    return
  }
}

function afterEventAction() {
  if (pendingEvents.value > 0) {
    prepareEventOptions()
    eventKey.value++
    phase.value = 'EVENT'
  } else {
    showBackpack.value = false
    loadEnemy()
    phase.value = 'ARRANGE'
  }
}

function prepareEventOption(e) {
  if (e.id === 'upgrade') {
    const allItems = [...playerItems, ...backpackItems]
    const upgradeable = allItems.filter(i => TIER_ORDER.indexOf(i.tier) < TIER_ORDER.length - 1)
    const tags = [...new Set(upgradeable.flatMap(i => i.tags || []))]
    shuffle(tags)
    const tag = tags[0] ?? null
    if (!tag) return null
    upgradeEventTag.value = tag
    return { ...e, desc: `升级「${tag}」类物品` }
  }
  if (e.id === 'shop') {
    const allTags = [...new Set(ITEM_POOL.flatMap(i => i.tags || []))]
    shuffle(allTags)
    const tags = allTags.slice(0, 3)
    const taggedPool = ITEM_POOL.filter(i => i.tags?.some(t => tags.includes(t)))
    const shuffledPool = [...taggedPool]; shuffle(shuffledPool)
    shopSlots.length = 0
    shuffledPool.slice(0, 3).forEach(item => shopSlots.push(item))
    return { ...e, desc: tags.join(' · ') }
  }
  if (e.id === 'exchange') {
    const hasItems = [...playerItems, ...backpackItems].length > 0
    if (!hasItems) return null
    return { ...e }
  }
  return { ...e }
}

function prepareEventOptions() {
  const isLastEvent = pendingEvents.value === 1
  const result = []

  const normalPool = EVENT_POOL.filter(e => e.pool === 'normal')
  const shuffled = [...normalPool]; shuffle(shuffled)
  const targetNormal = isLastEvent ? 2 : 3
  for (const e of shuffled) {
    if (result.length >= targetNormal) break
    const opt = prepareEventOption(e)
    if (opt) result.push(opt)
  }

  if (isLastEvent) {
    EVENT_POOL
      .filter(e => e.pool === 'last' && e.guaranteed)
      .forEach(e => { const opt = prepareEventOption(e); if (opt) result.push(opt) })
  }

  eventOptions.value = result
}

// ── 升级事件 ──────────────────────────────────────────────
const upgradeableItems = computed(() => {
  if (!upgradeEventTag.value) return []
  return [...playerItems, ...backpackItems].filter(i =>
    i.tags?.includes(upgradeEventTag.value) &&
    TIER_ORDER.indexOf(i.tier) < TIER_ORDER.length - 1
  )
})

function doUpgrade(inst) {
  if (gold.value < inst.price) return
  const nextTier = nextTierOf(inst.tier)
  if (nextTier === inst.tier) return
  const base = findItem(inst.id)
  const tierStats = base?.tiers?.[nextTier]
  if (!tierStats) return
  gold.value -= inst.price
  playMergeAnimation(inst, inst.tier, nextTier, base, tierStats, afterEventAction)
}

function skipUpgrade() {
  afterEventAction()
}

// ── 以物换物 ──────────────────────────────────────────────
const exchangeableItems = computed(() => [...playerItems, ...backpackItems])

function doExchange(inst) {
  const pool = ITEM_POOL.filter(i => i.id !== inst.id)
  const shuffled = [...pool]; shuffle(shuffled)
  const base = shuffled[0]
  if (!base) { afterEventAction(); return }
  const tierStats = base.tiers?.[inst.tier] || {}
  const newInst = mkInst({ ...base, tier: inst.tier, ...tierStats }, inst.col, inst.row ?? 0)
  const pIdx = playerItems.findIndex(i => i.instanceId === inst.instanceId)
  if (pIdx !== -1) playerItems.splice(pIdx, 1, newInst)
  else {
    const bIdx = backpackItems.findIndex(i => i.instanceId === inst.instanceId)
    if (bIdx !== -1) backpackItems.splice(bIdx, 1, newInst)
  }
  mergeFlash.value = `${inst.name_cn} → ${base.name_cn}！`
  setTimeout(() => { mergeFlash.value = '' }, 1800)
  afterEventAction()
}

function skipExchange() {
  afterEventAction()
}

function onSelectNode(type) {
  nodeType.value = type
  const bonus = type === 'elite' ? 3 : type === 'normal' ? 2 : 0
  gold.value = GOLD_PER_DAY + bonus
  phase.value = 'SHOP'
  rollShop()
  loadEnemy()
}

function resetGame() {
  stopBattle(); battleCount.value = 0; wins.value = 0; lives.value = MAX_LIVES
  nodeType.value = 'normal'
  playerStat.hp = playerStat.maxHp; playerStat.shield = 0
  playerStat.burnStacks = 0; playerStat.poisonStacks = 0
  playerItems.length = 0; backpackItems.length = 0
  showBackpack.value = false
  stormBlessingActive.value = false
  upgradeEventTag.value = null
  exchangeTargetItem.value = null
  eventOptions.value = []
  selectedIdentityName.value = ''
  phase.value = 'HOME'
}

function setSpeed(s) {
  battleSpeed.value = s
  setBattleSpeed(s)
  setPixiSpeed(s)
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]
  }
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }
</script>

<style scoped>
.app-wrap {
  display: flex; flex-direction: column;
  height: 100vh; width: 100%; max-width: 600px; margin: 0 auto;
  overflow: hidden;
}
</style>
