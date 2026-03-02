<template>
  <div class="app-wrap">

    <!-- ══════════════ 主界面 ══════════════ -->
    <template v-if="phase === 'HOME'">
      <div class="home-screen">
        <div class="home-deco">☠️</div>
        <h1 class="home-title">小巴扎</h1>
        <p class="home-sub">海盗贸易·卡牌自战</p>
        <button class="btn btn-primary home-btn" @click="startGame">开始游戏</button>
      </div>
    </template>

    <!-- ══════════════ 身份选择 ══════════════ -->
    <template v-else-if="phase === 'IDENTITY'">
      <IdentityScreen @choose="onIdentityChoice" />
    </template>

    <!-- ══════════════ 战前预览（已停用，直接出发）══════════════ -->
    <template v-else-if="phase === 'PREVIEW'"></template>

    <!-- ══════════════ 战报 ══════════════ -->
    <template v-else-if="phase === 'REPORT'">
      <ReportScreen
        :result="resultType"
        :battle-count="battleCount"
        :wins="wins"
        :lives="lives"
        :enemy-name="currentEnemy.name"
        :item-stats="battleItemStats"
        @next="onResultNext"
      />
    </template>

    <!-- ══════════════ 事件三选一 ══════════════ -->
    <template v-else-if="phase === 'EVENT'">
      <EventScreen
        :key="eventKey"
        :options="eventOptions"
        @choice="onEventChoice"
      />
    </template>

    <!-- ══════════════ 以物换物选择 ══════════════ -->
    <template v-else-if="phase === 'EXCHANGE'">
      <div class="upgrade-screen">
        <div class="upgrade-header">
          <span class="upgrade-title">🔀 选择送出的物品</span>
          <button class="upgrade-skip-btn" @click="skipExchange">跳过</button>
        </div>
        <div class="upgrade-list">
          <div
            v-for="item in exchangeableItems"
            :key="item.instanceId"
            class="upgrade-item-row"
            @click="doExchange(item)"
          >
            <img :src="getIconUrl(item.name_en)" class="upgrade-item-img" draggable="false" />
            <div class="upgrade-item-body">
              <div class="upgrade-item-name">{{ item.name_cn }}</div>
              <div class="upgrade-tier-line">
                <span :class="`tier-text-${item.tier}`">{{ appTierLabel(item.tier) }}</span>
                <span class="upgrade-arrow"> → 随机同品质物品</span>
              </div>
            </div>
          </div>
          <div v-if="exchangeableItems.length === 0" class="upgrade-empty">
            暂无可交换的物品
          </div>
        </div>
      </div>
    </template>

    <!-- ══════════════ 升级选择 ══════════════ -->
    <template v-else-if="phase === 'UPGRADE'">
      <div class="upgrade-screen">
        <div class="upgrade-header">
          <span class="upgrade-title">⬆️ 升级「{{ upgradeEventTag }}」类物品</span>
          <button class="upgrade-skip-btn" @click="skipUpgrade">跳过</button>
        </div>
        <div class="upgrade-list">
          <div
            v-for="item in upgradeableItems"
            :key="item.instanceId"
            class="upgrade-item-row"
            :class="{ 'cant-afford': gold < item.price }"
            @click="doUpgrade(item)"
          >
            <img :src="getIconUrl(item.name_en)" class="upgrade-item-img" draggable="false" />
            <div class="upgrade-item-body">
              <div class="upgrade-item-name">{{ item.name_cn }}</div>
              <div class="upgrade-tier-line">
                <span :class="`tier-text-${item.tier}`">{{ appTierLabel(item.tier) }}</span>
                <span class="upgrade-arrow"> → </span>
                <span :class="`tier-text-${nextTierOf(item.tier)}`">{{ appTierLabel(nextTierOf(item.tier)) }}</span>
              </div>
              <div class="upgrade-preview">{{ upgradePreview(item) }}</div>
            </div>
            <div class="upgrade-cost" :class="{ dim: gold < item.price }">💰{{ item.price }}</div>
          </div>
          <div v-if="upgradeableItems.length === 0" class="upgrade-empty">
            暂无可升级的「{{ upgradeEventTag }}」类物品
          </div>
        </div>
      </div>
    </template>

    <!-- ══════════════ 战斗模式 ══════════════ -->
    <template v-else-if="phase === 'BATTLE'">

      <!-- 战斗速度控制（顶部） -->
      <div class="speed-bar">
        <button
          v-for="s in [0.1,1,2,3]"
          :key="s"
          class="speed-btn"
          :class="{ active: battleSpeed === s }"
          @click="setSpeed(s)"
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
        @deploy-complete="onDeployComplete"
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

    <!-- ══════════════ 整理阵容模式 ══════════════ -->
    <template v-else-if="phase === 'ARRANGE'">
      <div class="upper-panel arrange-mode">
        <div class="panel-status">
          <div class="status-lives">
            <span v-for="i in MAX_LIVES" :key="i" class="heart-icon">{{ i <= lives ? '❤️' : '🖤' }}</span>
          </div>
          <div class="status-info">第 {{ battleCount + 1 }} 战 · {{ wins }}/5 ⭐</div>
          <div class="status-gold">💰 {{ gold }}</div>
        </div>
        <div class="panel-header">
          <div class="panel-header-spacer"></div>
          <span class="panel-title">⚔️ 整理阵容</span>
          <button class="go-battle-btn" @click="onStartBattle">⚔️ 出发</button>
        </div>
        <div class="panel-body">
          <div v-if="!showBackpack" class="arrange-empty">
            <div class="arrange-hint">调整阵容后出发</div>
          </div>
          <div v-else class="backpack-view">
            <GridBoard
              :items="backpackItems" zone="backpack"
              :is-enemy="false" :is-battle="false"
              :compact="false" :cell-size="113" :cell-height="155"
            />
            <div v-if="backpackItems.length === 0" class="backpack-empty">空背包 · 可从阵容拖入</div>
          </div>
        </div>
      </div>
      <div class="formation-panel">
        <div class="formation-header">
          <span class="panel-label">— 我方阵容 —</span>
          <button class="backpack-toggle-btn" @click="showBackpack = !showBackpack">
            {{ showBackpack ? '🗡️ 阵容' : '🎒 背包' }}
          </button>
        </div>
        <GridBoard
          :items="playerItems" zone="player"
          :is-enemy="false" :is-battle="false"
          :compact="false" :cell-size="113" :cell-height="155"
          :rows="1" :unlocked-cols="unlockedCols"
        />
        <div class="sell-zone" :class="{ 'drag-over-sell': dragState.overSellZone }">
          🗑️ 拖到此处出售 (+1金)
        </div>
      </div>
    </template>

    <!-- ══════════════ 商店模式 ══════════════ -->
    <template v-else-if="phase === 'SHOP'">

      <!-- 上方面板（商店 / 背包切换），flex:1 占半屏 -->
      <div class="upper-panel">
        <!-- 顶部状态行：生命 + 战局 + 金币 -->
        <div class="panel-status">
          <div class="status-lives">
            <span v-for="i in MAX_LIVES" :key="i" class="heart-icon">{{ i <= lives ? '❤️' : '🖤' }}</span>
          </div>
          <div class="status-info">第 {{ battleCount + 1 }} 战 · {{ wins }}/5 ⭐</div>
          <div class="status-gold">💰 {{ gold }}</div>
        </div>
        <!-- 功能按钮行 -->
        <div class="panel-header">
          <button
            v-if="!showBackpack"
            class="reroll-icon-btn"
            :disabled="gold < 1"
            @click="onReroll"
            title="刷新商品 (−1💰)"
          >🔄<span class="reroll-badge">1</span></button>
          <div v-else class="panel-header-spacer"></div>
          <span class="panel-title">{{ showBackpack ? '🎒 背包' : '🏪 商店' }}</span>
          <button class="go-battle-btn" @click="onStartBattle">⚔️ 出发</button>
        </div>
        <div class="panel-body">
          <ShopSection v-if="!showBackpack" :slots="shopSlots" :gold="gold" @buy="onBuy" />
          <div v-else class="backpack-view">
            <GridBoard
              :items="backpackItems" zone="backpack"
              :is-enemy="false" :is-battle="false"
              :compact="false" :cell-size="113" :cell-height="155"
            />
            <div v-if="backpackItems.length === 0" class="backpack-empty">空背包 · 可从商店拖入或购买后溢出</div>
          </div>
        </div>
      </div>

      <!-- 下方阵容区，flex:1 占半屏 -->
      <div class="formation-panel">
        <div class="formation-header">
          <span class="panel-label">— 我方阵容 —</span>
          <button class="backpack-toggle-btn" @click="showBackpack = !showBackpack">
            {{ showBackpack ? '🏪 商店' : '🎒 背包' }}
          </button>
        </div>
        <GridBoard
          :items="playerItems" zone="player"
          :is-enemy="false" :is-battle="false"
          :compact="false" :cell-size="113" :cell-height="155"
          :rows="1" :unlocked-cols="unlockedCols"
        />
        <div class="sell-zone" :class="{ 'drag-over-sell': dragState.overSellZone }">
          🗑️ 拖到此处出售 (+1金)
        </div>
      </div>
    </template>

    <!-- 结算由 REPORT 阶段处理，此处保留占位以防旧 RESULT 状态 -->

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

    <!-- 商店卡片详情浮层 -->
    <Teleport to="body">
      <Transition name="detail-fade">
        <div v-if="detailItem" class="detail-overlay" @click.self="detailItem = null">
          <div class="detail-card">
            <!-- 关闭 -->
            <button class="detail-close" @click="detailItem = null">✕</button>

            <!-- 图片 -->
            <div class="detail-img-wrap">
              <img :src="getIconUrl(detailItem.name_en)" :alt="detailItem.name_cn"
                class="detail-img" draggable="false" />
            </div>

            <!-- 品级色条 + 名称 -->
            <div class="detail-tier-bar" :style="detailTierStyle"></div>
            <div class="detail-name">{{ detailItem.name_cn }}</div>

            <!-- 标签 + 尺寸 -->
            <div class="detail-tags">
              <span v-for="t in detailItem.tags" :key="t" class="detail-tag">{{ t }}</span>
            </div>

            <!-- 属性 -->
            <div class="detail-stats">
              <div v-if="detailItem.damage"  class="stat-row">⚔️ 伤害<span>{{ detailItem.damage }}</span></div>
              <div v-if="detailItem.heal"    class="stat-row">💚 治疗<span>{{ detailItem.heal }}</span></div>
              <div v-if="detailItem.shield"  class="stat-row">🛡 护盾<span>{{ detailItem.shield }}</span></div>
              <div v-if="detailItem.burn"    class="stat-row">🔥 灼烧<span>{{ detailItem.burn }}</span></div>
              <div v-if="detailItem.poison"  class="stat-row">☠ 剧毒<span>{{ detailItem.poison }}</span></div>
              <div class="stat-row">⏱ 冷却<span>{{ detailItem.cooldown / 1000 }}s</span></div>
            </div>

            <!-- 技能描述 -->
            <div class="detail-skill">{{ detailItem.skill_cn }}</div>

            <!-- 购买按钮 -->
            <button
              class="detail-buy-btn"
              :class="{ 'can-afford': gold >= detailItem.price }"
              :disabled="gold < detailItem.price"
              @click="onBuy(detailItem, detailSlot); detailItem = null"
            >💰{{ detailItem.price }} 购买</button>
          </div>
        </div>
      </Transition>
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

    <!-- 升星提示 -->
    <Teleport to="body">
      <div v-if="mergeFlash" class="merge-toast">✨ {{ mergeFlash }}</div>
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
import GridBoard      from './components/GridBoard.vue'
import ItemCard       from './components/ItemCard.vue'
import ShopSection    from './components/ShopSection.vue'
import BattleArena    from './components/BattleArena.vue'
import PreviewScreen  from './components/PreviewScreen.vue'
import ReportScreen   from './components/ReportScreen.vue'
import MapScreen      from './components/MapScreen.vue'
import EventScreen    from './components/EventScreen.vue'
import IdentityScreen from './components/IdentityScreen.vue'
import { ITEM_POOL, findItem, canPlace, getIconUrl } from './data/items.js'
import { findIdentity, getEnemyByBattle, EVENT_POOL } from './data/config.js'
import { dragState, setDragCallbacks, registerGlobalListeners, cancelDrag } from './composables/useDrag.js'
import { startBattle, stopBattle, setBattleSpeed } from './composables/useBattle.js'
import { setPixiSpeed } from './composables/usePixiBattle.js'

const MAX_LIVES    = 2
const GOLD_PER_DAY = 10
let ic = 0
const newId = () => `i${++ic}`

const phase       = ref('HOME')
const battleCount = ref(0)          // 替代 day，已完成的战役场次
const nodeType    = ref('normal')   // 'normal' | 'elite' | 'market'
const wins        = ref(0)
const lives       = ref(MAX_LIVES)
const gold        = ref(GOLD_PER_DAY)
const resultType      = ref('win')
const battleFlash     = ref(false)
const mergeFlash      = ref('')     // 升星提示文字
const battleSpeed     = ref(1)      // 1 / 2 / 3
const battleItemStats = ref([])     // 战报：每个物品的数据
const selectedIdentityName = ref('')

const playerStat     = reactive({ hp: 500, maxHp: 500, shield: 0, burnStacks: 0, poisonStacks: 0 })
const enemyStat      = reactive({ hp: 200, maxHp: 200, shield: 0, burnStacks: 0, poisonStacks: 0 })
const playerItems    = reactive([])
const backpackItems  = reactive([])
const enemyAbilities = reactive([])
const shopSlots      = reactive([])
const currentEnemy   = ref(getEnemyByBattle(0))
const showBackpack   = ref(false)
const detailItem      = ref(null)   // 当前展开详情的商店物品
const detailSlot      = ref(-1)
const pendingEvents       = ref(0)     // 当前轮剩余事件数
const eventKey            = ref(0)     // 每次进入 EVENT 自增，强制 EventScreen 重新挂载
const eventOptions        = ref([])    // 当前事件展示的3个选项
const stormBlessingActive = ref(false) // 风暴祝福：下一场开场护盾
const upgradeEventTag     = ref(null)  // 升级事件：当前开放的类型标签
const exchangeTargetItem  = ref(null)  // 以物换物：当前被抽中的物品

const battleArenaRef = ref(null)  // BattleArena 组件引用


const latestAttack  = ref(null)   // 传给 BattleArena 的最新攻击事件
const playerHitType = ref(null)
const enemyHitType  = ref(null)
const playerHitClass = computed(() => playerHitType.value ? `hit-${playerHitType.value}` : '')
const enemyHitClass  = computed(() => enemyHitType.value  ? `hit-${enemyHitType.value}`  : '')

const playerHpPct = computed(() => Math.max(0, Math.min(100, playerStat.hp / playerStat.maxHp * 100)))
const enemyHpPct  = computed(() => Math.max(0, Math.min(100, enemyStat.hp  / enemyStat.maxHp  * 100)))

const detailTierStyle = computed(() => {
  const colors = { Bronze: 'var(--bronze)', Silver: 'var(--silver)', Gold: 'var(--gold)', Diamond: 'var(--diamond)' }
  return { background: colors[detailItem.value?.tier] || '#888' }
})

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
  setDragCallbacks({
    dropToGrid:       handleDropToGrid,
    dropToSell:       handleDropToSell,
    dropToBackpack:   handleDropToBackpack,
    gridState:        () => buildGridState(playerItems),
    backpackGridState:() => buildBackpackGridState(),
    clickBuy:         (item, slot) => { detailItem.value = item; detailSlot.value = slot },
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
  // 初始化技能实例（reactive，useBattle 直接修改 cooldownProgress/triggering）
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

// ── 查找格子中可堆叠的同款物品（同 id + 同 tier，二合一升级）──
function findStackable(item) {
  return playerItems.find(i => i.id === item.id && i.tier === item.tier && i.stack < 2) ?? null
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
  // 上阵区有空位
  const fs = findFreeSlot()
  if (fs) {
    gold.value -= item.price
    if (shopSlot >= 0) shopSlots[shopSlot] = null
    playerItems.push(mkInst(item, fs.col, fs.row))
    return true
  }
  // 上阵区满，放背包
  const bps = findFreeBackpackSlot()
  if (bps) {
    gold.value -= item.price
    if (shopSlot >= 0) shopSlots[shopSlot] = null
    backpackItems.push(mkInst(item, bps.col, bps.row))
    return true
  }
  return false
}

// ── 堆叠计数 + 升级逻辑（使用 tiers 精确数值）──────────────
function incrementStack(inst) {
  inst.stack = (inst.stack || 1) + 1
  if (inst.stack >= 2) {  // 二合一升级
    const nextTier = TIER_ORDER[TIER_ORDER.indexOf(inst.tier) + 1]
    if (nextTier) {
      const base      = findItem(inst.id)
      const tierStats = base?.tiers?.[nextTier]
      if (tierStats) {
        inst.tier = nextTier
        Object.assign(inst, tierStats)
        inst.stack = 1
        mergeFlash.value = `${base.name_cn} 升级为 ${nextTierLabel(nextTier)}！`
        setTimeout(() => { mergeFlash.value = '' }, 1800)
      }
    } else {
      inst.stack = 1  // 已是最高品级，保持 stack=1
    }
  }
}

function handleDropToGrid(item, col, row, sourceType, sourceInstanceId, sourceShopSlot) {
  if (phase.value !== 'SHOP' && phase.value !== 'ARRANGE') return
  if (sourceType === 'grid') {
    // 阵容内移动
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
    // 背包 → 阵容
    const idx = backpackItems.findIndex(i => i.instanceId === sourceInstanceId)
    if (idx === -1) return
    if (!canPlace(buildGridState(playerItems), col, row, unlockedCols.value, 1)) return
    backpackItems.splice(idx, 1)
    const inst = mkInst(item, col, row)
    inst.instanceId = sourceInstanceId
    inst.stack = item.stack ?? 1
    playerItems.push(inst)
  } else {
    // 从商店拖入：走购买逻辑（但强制放到指定格）
    tryBuyItem(item, sourceShopSlot)
  }
}

function handleDropToBackpack(item, col, row, sourceType, sourceInstanceId, sourceShopSlot) {
  if (phase.value !== 'SHOP' && phase.value !== 'ARRANGE') return
  if (sourceType === 'grid') {
    // 阵容 → 背包
    const idx = playerItems.findIndex(i => i.instanceId === sourceInstanceId)
    if (idx === -1) return
    if (!canPlace(buildBackpackGridState(), col, row)) return
    playerItems.splice(idx, 1)
    const inst = mkInst(item, col, row)
    inst.instanceId = sourceInstanceId
    inst.stack = item.stack ?? 1
    backpackItems.push(inst)
  } else if (sourceType === 'backpack') {
    // 背包内移动
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
    // 直接购买进背包
    if (gold.value < item.price) return
    if (!canPlace(buildBackpackGridState(), col, row)) return
    gold.value -= item.price
    if (sourceShopSlot >= 0) shopSlots[sourceShopSlot] = null
    backpackItems.push(mkInst(item, col, row))
  }
}

function handleDropToSell(instanceId) {
  if (phase.value !== 'SHOP' && phase.value !== 'ARRANGE') return
  let idx = playerItems.findIndex(i => i.instanceId === instanceId)
  if (idx !== -1) { playerItems.splice(idx, 1); gold.value++; return }
  idx = backpackItems.findIndex(i => i.instanceId === instanceId)
  if (idx !== -1) { backpackItems.splice(idx, 1); gold.value++ }
}

function onBuy(item, shopSlot) {
  tryBuyItem(item, shopSlot)
  document.getElementById('item-tooltip')?.classList.add('hidden')
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

// ── 升星品级配置 ─────────────────────────────────────────
const TIER_ORDER = ['Bronze', 'Silver', 'Gold', 'Diamond']

function nextTierLabel(t) {
  const map = { Silver: '⭐白银', Gold: '⭐⭐黄金', Diamond: '⭐⭐⭐钻石' }
  return map[t] || t
}

// 商店 / 整理阵容"出发"→ 直接开始战斗（跳过预览）
function onStartBattle() {
  if (phase.value !== 'SHOP' && phase.value !== 'ARRANGE') return
  cancelDrag()  // 清除可能残留的拖拽状态
  startActualBattle()
}

// 战前预览"确认开战"→ 开始实际战斗
async function startActualBattle() {
  // 1. 在 PREVIEW 阶段捕获源坐标（DOM 还在，不会消失）
  const srcRects = captureSourceRects()

  // 2. 剑击开场特效
  battleFlash.value = true
  await sleep(600)
  battleFlash.value = false

  // 3. 切换到 BATTLE 阶段
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

  // 4. 等 Vue 更新 DOM + 浏览器完成 CSS Grid 布局
  await nextTick()
  await new Promise(r => requestAnimationFrame(r))

  // 5. 捕获目标坐标，交给 BattleArena 的 PIXI 引擎做入场动画
  const dstRects = captureDestRects()
  battleArenaRef.value?.startBattleDeploy(srcRects, dstRects)
  // ← 战斗将在 onDeployComplete（@deploy-complete 事件）中启动
}

// 入场动画结束 → 启动战斗引擎
function onDeployComplete() {
  battleArenaRef.value?.onBattleStart()
  startBattle(playerItems, enemyAbilities, playerStat, enemyStat, {
    onHpChange:  handleHpChange,
    onBattleEnd: handleBattleEnd,
    onAttack:    (info) => { latestAttack.value = { ...info, _t: Date.now() } },
  })
}

// 计算各物品源坐标（从 PREVIEW 或 SHOP 阵容格）
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
  // 优先 PREVIEW，否则用 SHOP 阵容格
  _calc(
    document.querySelector('.player-section .grid-container') ||
    document.querySelector('.formation-panel .grid-container'),
    playerItems
  )
  return rects
}

// 从 BATTLE 的 arena-grid 容器计算各物品目标坐标
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
  phase.value = 'REPORT'  // 进入战报界面
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

// 身份选择 → 给起始物品 → 1次遭遇事件 → 整备(ARRANGE) → 战斗
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

  // 开局先触发一个只有"前往商店"的特殊事件，再进商店
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
    phase.value = 'ARRANGE'
  }
}

// ── 单个事件选项构建：返回构建好的选项对象，条件不满足时返回 null ──
// pool / condition / guaranteed 由 events.json 配置，执行逻辑在此处理
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

  // 其余事件（storm_blessing 等）直接使用 config 数据
  return { ...e }
}

// ── 事件池装配：pool/guaranteed 完全由 events.json 驱动 ──────
// normal pool：随机抽满，末尾事件只取 2 个，留位给 last pool 保底项
function prepareEventOptions() {
  const isLastEvent = pendingEvents.value === 1
  const result = []

  // 1. normal pool 随机排序后依次尝试构建，直到凑够目标数
  const normalPool = EVENT_POOL.filter(e => e.pool === 'normal')
  const shuffled = [...normalPool]; shuffle(shuffled)
  const targetNormal = isLastEvent ? 2 : 3
  for (const e of shuffled) {
    if (result.length >= targetNormal) break
    const opt = prepareEventOption(e)
    if (opt) result.push(opt)
  }

  // 2. last pool 保底项（仅末尾事件追加）
  if (isLastEvent) {
    EVENT_POOL
      .filter(e => e.pool === 'last' && e.guaranteed)
      .forEach(e => { const opt = prepareEventOption(e); if (opt) result.push(opt) })
  }

  eventOptions.value = result
}

// ── 升级事件：可升级物品列表 ────────────────────────────
const upgradeableItems = computed(() => {
  if (!upgradeEventTag.value) return []
  return [...playerItems, ...backpackItems].filter(i =>
    i.tags?.includes(upgradeEventTag.value) &&
    TIER_ORDER.indexOf(i.tier) < TIER_ORDER.length - 1
  )
})

function nextTierOf(tier) {
  return TIER_ORDER[TIER_ORDER.indexOf(tier) + 1] ?? tier
}

function appTierLabel(t) {
  return { Bronze: '铜', Silver: '⭐银', Gold: '⭐⭐金', Diamond: '⭐⭐⭐钻' }[t] || t
}

function upgradePreview(inst) {
  const base = findItem(inst.id)
  const nextTier = nextTierOf(inst.tier)
  if (!base || nextTier === inst.tier) return ''
  const next = base.tiers?.[nextTier]
  if (!next) return ''
  const parts = []
  if (next.damage  !== inst.damage)  parts.push(`⚔️${inst.damage}→${next.damage}`)
  if (next.heal    !== inst.heal)    parts.push(`💚${inst.heal}→${next.heal}`)
  if (next.shield  !== inst.shield)  parts.push(`🛡${inst.shield}→${next.shield}`)
  if (next.burn    !== inst.burn)    parts.push(`🔥${inst.burn}→${next.burn}`)
  if (next.poison  !== inst.poison)  parts.push(`☠${inst.poison}→${next.poison}`)
  return parts.join('  ') || '属性提升'
}

function doUpgrade(inst) {
  if (gold.value < inst.price) return
  const nextTier = nextTierOf(inst.tier)
  if (nextTier === inst.tier) return
  const base = findItem(inst.id)
  const tierStats = base?.tiers?.[nextTier]
  if (!tierStats) return
  gold.value -= inst.price
  inst.tier = nextTier
  Object.assign(inst, tierStats)
  inst.stack = 1
  mergeFlash.value = `${base.name_cn} 升级为 ${nextTierLabel(nextTier)}！`
  setTimeout(() => { mergeFlash.value = '' }, 1800)
  afterEventAction()
}

function skipUpgrade() {
  afterEventAction()
}

// ── 以物换物：可选物品列表 ────────────────────────────────
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

<style>
/* 战斗卡片攻击闪光（全局，因为 ArenaCard 在 shadow DOM 外触发）*/
.flash-attack {
  animation: flash-atk .45s ease-out !important;
}
@keyframes flash-atk {
  0%   { box-shadow: 0 0 0 rgba(255,220,50,0); }
  25%  { box-shadow: 0 0 16px 4px rgba(255,220,50,.7); }
  100% { box-shadow: 0 0 0 rgba(255,220,50,0); }
}

.tooltip {
  position: fixed; background: #0c1e35; border: 1px solid var(--panel-border);
  border-radius: 8px; padding: 10px 12px; min-width: 180px; max-width: 240px;
  z-index: 8000; pointer-events: none; box-shadow: 0 4px 16px rgba(0,0,0,.6);
}
.tooltip.hidden { display: none !important; }
.tt-name  { font-size: 14px; font-weight: bold; color: var(--gold); margin-bottom: 4px; }
.tt-tags  { font-size: 11px; color: var(--text-dim); margin-bottom: 6px; }
.tt-stats { font-size: 12px; color: #a8d8ea; line-height: 1.7; margin-bottom: 6px; }
.tt-skill { font-size: 11px; color: var(--text-dim); font-style: italic;
            border-top: 1px solid var(--panel-border); padding-top: 6px; }
</style>

<style scoped>
.app-wrap {
  display: flex; flex-direction: column;
  height: 100vh; width: 100%; max-width: 600px; margin: 0 auto;
  overflow: hidden;
}

/* ── 战斗：HP 条带 ── */
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


/* ── 主界面 ── */
.home-screen {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 16px;
  background:
    radial-gradient(ellipse at 50% 40%, rgba(8,5,2,.28) 0%, rgba(8,5,2,.75) 100%),
    url('/background/bg-clear.png') center 20% / cover no-repeat;
}
.home-deco {
  font-size: 64px;
  filter: drop-shadow(0 0 24px rgba(200,134,10,.6));
  animation: deco-float 3s ease-in-out infinite;
}
@keyframes deco-float {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-8px); }
}
.home-title {
  font-size: 42px; font-weight: 900; letter-spacing: 6px;
  color: var(--gold);
  text-shadow: 0 0 20px rgba(200,134,10,.6), 0 2px 8px rgba(0,0,0,.8);
}
.home-sub {
  font-size: 13px; color: var(--text-dim); letter-spacing: 3px;
}
.home-btn {
  margin-top: 12px; padding: 12px 48px; font-size: 16px;
  letter-spacing: 4px; border-radius: 8px;
}

/* ── 商店阶段：状态行（upper-panel 内顶部）── */
.panel-status {
  flex-shrink: 0;
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 12px 4px;
  background: rgba(6,4,1,.82);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}
.status-lives { display: flex; gap: 1px; font-size: 13px; }
.heart-icon   { line-height: 1; }
.status-info  { font-size: 11px; color: var(--text-dim); }
.status-gold  { font-size: 15px; font-weight: bold; color: var(--gold); }

/* ── 商店阶段：上方面板（占半屏）── */
.upper-panel {
  flex: 1; min-height: 0;
  /* 上部深（给状态/头部），中部透（让炼金摊货架透出），底部微深 */
  background:
    linear-gradient(180deg,
      rgba(6,4,1,.0) 0%,
      rgba(6,4,1,.0) 40%,
      rgba(6,4,1,.15) 75%,
      rgba(6,4,1,.30) 100%),
    url('/background/bg-clear.png') center 35% / cover no-repeat;
  border-bottom: 2px solid rgba(140,80,20,.4);
  display: flex; flex-direction: column;
}
/* 整理阵容模式上方面板 → 船只工坊 */
.upper-panel.arrange-mode {
  background:
    linear-gradient(180deg,
      rgba(6,4,1,.0) 0%,
      rgba(5,3,1,.0) 40%,
      rgba(5,3,1,.18) 72%,
      rgba(5,3,1,.35) 100%),
    url('/background/bg-clear.png') center 55% / cover no-repeat;
}
.panel-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 6px 10px;
  border-bottom: 1px solid rgba(140,80,20,.3);
  background: rgba(6,4,1,.78);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}
.reroll-icon-btn {
  position: relative;
  width: 36px; height: 36px; flex-shrink: 0;
  background: var(--panel); border: 1px solid var(--panel-border);
  border-radius: 50%; font-size: 17px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: border-color .12s, background .12s;
  font-family: inherit;
}
.reroll-icon-btn:not(:disabled):hover { border-color: var(--gold); background: rgba(200,134,10,.1); }
.reroll-icon-btn:disabled { opacity: .3; cursor: not-allowed; }
.reroll-badge {
  position: absolute; top: -4px; right: -4px;
  background: var(--gold); color: #1a0e00;
  font-size: 9px; font-weight: bold; border-radius: 50%;
  width: 15px; height: 15px;
  display: flex; align-items: center; justify-content: center;
  pointer-events: none;
}
.panel-title { font-size: 12px; color: var(--text-dim); letter-spacing: 1px; }
.go-battle-btn {
  padding: 7px 14px; border-radius: 6px; font-size: 13px; font-weight: bold;
  cursor: pointer; font-family: inherit;
  background: linear-gradient(135deg, #7a1a08, #c0350a);
  color: #f0d9b5; border: 1px solid #c04010;
  box-shadow: 0 2px 6px rgba(150,50,10,.3);
  transition: filter .1s;
}
.go-battle-btn:hover { filter: brightness(1.12); }
.panel-body {
  flex: 1; min-height: 0;
  padding: 8px;
  display: flex; flex-direction: column;
  justify-content: center; align-items: center;
}

/* ── 背包视图 ── */
.backpack-view {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  width: 100%;
}
.arrange-empty {
  display: flex; align-items: center; justify-content: center; flex: 1;
}
.arrange-hint {
  color: var(--text-dim); font-size: 13px; opacity: .6; letter-spacing: 1px;
}
.backpack-empty {
  color: var(--text-dim); font-size: 11px;
  padding: 12px; text-align: center; opacity: .7;
}

/* ── 商店阶段：下方阵容区（占半屏）── */
.formation-panel {
  flex: 1; min-height: 0;
  /* 船坞背景：头部区域深，中间（阵容网格）稍透，底部深（出售区） */
  background:
    linear-gradient(180deg,
      rgba(5,3,1,.0)  0%,
      rgba(5,3,1,.0)  25%,
      rgba(5,3,1,.12) 60%,
      rgba(5,3,1,.35) 100%),
    url('/background/bg-clear.png') center 75% / cover no-repeat;
  padding: 8px 8px 12px;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 6px;
}
.panel-label { font-size: 11px; color: var(--text-dim); letter-spacing: 2px; }
.formation-header {
  width: 100%;
  display: flex; justify-content: space-between; align-items: center;
  padding: 4px 6px;
  background: rgba(6,4,1,.72);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  border-radius: 8px;
}
.backpack-toggle-btn {
  font-size: 11px; padding: 3px 10px; border-radius: 10px;
  background: var(--panel); border: 1px solid var(--panel-border);
  color: var(--text-dim); cursor: pointer; font-family: inherit;
  transition: border-color .12s, color .12s;
}
.backpack-toggle-btn:hover { border-color: var(--gold); color: var(--gold); }

/* 背包模式下刷新按钮占位（保持对称布局） */
.panel-header-spacer { width: 36px; height: 36px; flex-shrink: 0; }

/* ── 商店卡片详情浮层 ── */
.detail-overlay {
  position: fixed; inset: 0; z-index: 9000;
  background: rgba(0,0,0,.72);
  display: flex; align-items: center; justify-content: center;
}
.detail-card {
  position: relative;
  width: 280px;
  background: #0f1a2a;
  border: 1px solid var(--panel-border);
  border-radius: 12px;
  overflow: hidden;
  display: flex; flex-direction: column;
  box-shadow: 0 8px 40px rgba(0,0,0,.8);
}
.detail-close {
  position: absolute; top: 8px; right: 8px; z-index: 2;
  width: 28px; height: 28px; border-radius: 50%;
  background: rgba(0,0,0,.6); border: 1px solid var(--panel-border);
  color: var(--text-dim); font-size: 13px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: border-color .12s, color .12s;
}
.detail-close:hover { border-color: #e74c3c; color: #e74c3c; }

.detail-img-wrap {
  width: 100%; height: 160px;
  background: #080e18;
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}
.detail-img { width: 100%; height: 100%; object-fit: contain; }

.detail-tier-bar { height: 3px; width: 100%; }

.detail-name {
  font-size: 18px; font-weight: bold; color: var(--gold);
  padding: 10px 14px 4px; letter-spacing: 1px;
}
.detail-tags {
  display: flex; flex-wrap: wrap; gap: 4px;
  padding: 0 14px 10px;
}
.detail-tag {
  font-size: 10px; padding: 2px 7px; border-radius: 10px;
  background: rgba(255,255,255,.08); color: var(--text-dim);
  border: 1px solid rgba(255,255,255,.1);
}
.detail-stats {
  padding: 8px 14px; border-top: 1px solid var(--panel-border);
  display: flex; flex-direction: column; gap: 5px;
}
.stat-row {
  display: flex; justify-content: space-between;
  font-size: 12px; color: var(--text-dim);
}
.stat-row span { color: var(--text); font-weight: bold; }
.detail-skill {
  font-size: 11px; font-style: italic; color: var(--text-dim);
  padding: 8px 14px; border-top: 1px solid var(--panel-border);
  line-height: 1.5;
}
.detail-buy-btn {
  margin: 10px 14px 14px;
  padding: 10px; border-radius: 7px;
  background: #2a1808; border: 1px solid #5a3010;
  color: var(--text-dim); font-size: 14px; font-weight: bold;
  cursor: pointer; font-family: inherit;
  transition: background .12s, color .12s, border-color .12s;
}
.detail-buy-btn.can-afford { color: var(--gold); border-color: var(--gold); }
.detail-buy-btn.can-afford:hover:not(:disabled) { background: #3a2010; }
.detail-buy-btn:disabled { opacity: .35; cursor: not-allowed; }

/* 浮层出入动画 */
.detail-fade-enter-active { transition: opacity .18s ease, transform .18s ease; }
.detail-fade-leave-active { transition: opacity .14s ease, transform .14s ease; }
.detail-fade-enter-from, .detail-fade-leave-to {
  opacity: 0; transform: scale(.94);
}

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
/* 慢速调试按钮 */
.speed-btn:first-child {
  color: #7ec8e3;
  border-color: rgba(126,200,227,.35);
}
.speed-btn:first-child.active {
  background: rgba(126,200,227,.15);
  color: #7ec8e3; border-color: #7ec8e3;
}

/* ── 升级选择阶段 ── */
.upgrade-screen {
  flex: 1; display: flex; flex-direction: column;
  background:
    linear-gradient(rgba(4,8,18,.88), rgba(4,8,18,.88)),
    url('/background/bg-sea-chart.png') center / cover no-repeat;
}
.upgrade-header {
  flex-shrink: 0; display: flex; justify-content: space-between; align-items: center;
  padding: 14px 14px 10px;
  border-bottom: 1px solid var(--panel-border);
}
.upgrade-title { font-size: 16px; font-weight: bold; color: var(--gold); }
.upgrade-skip-btn {
  padding: 6px 14px; border-radius: 6px; font-size: 12px;
  background: var(--panel); border: 1px solid var(--panel-border);
  color: var(--text-dim); cursor: pointer; font-family: inherit;
}
.upgrade-skip-btn:hover { border-color: var(--gold); color: var(--gold); }
.upgrade-list {
  flex: 1; overflow-y: auto; padding: 10px 12px;
  display: flex; flex-direction: column; gap: 8px;
}
.upgrade-item-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: 10px; cursor: pointer;
  background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08);
  transition: border-color .14s, background .14s;
}
.upgrade-item-row:hover:not(.cant-afford) {
  border-color: var(--gold); background: rgba(200,134,10,.08);
}
.upgrade-item-row.cant-afford { opacity: .4; cursor: not-allowed; }
.upgrade-item-img { width: 44px; height: 44px; border-radius: 8px; object-fit: cover; flex-shrink: 0; }
.upgrade-item-body { flex: 1; display: flex; flex-direction: column; gap: 3px; }
.upgrade-item-name { font-size: 13px; font-weight: bold; color: var(--text); }
.upgrade-tier-line { font-size: 11px; display: flex; align-items: center; gap: 3px; }
.upgrade-arrow { color: var(--text-dim); }
.upgrade-preview { font-size: 11px; color: var(--text-dim); }
.upgrade-cost { font-size: 13px; font-weight: bold; color: var(--gold); flex-shrink: 0; }
.upgrade-cost.dim { color: #555; }
.upgrade-empty { color: var(--text-dim); font-size: 13px; text-align: center; padding: 32px 0; opacity: .6; }
.tier-text-Bronze  { color: var(--bronze); }
.tier-text-Silver  { color: var(--silver); }
.tier-text-Gold    { color: var(--gold);   }
.tier-text-Diamond { color: var(--gem);    }
</style>
