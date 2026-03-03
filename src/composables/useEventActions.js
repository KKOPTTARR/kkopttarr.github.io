import { computed } from 'vue'
import { ITEM_POOL, findItem } from '../data/items.js'
import { TIER_ORDER, nextTierOf } from '../data/tiers.js'
import { incrementStack } from './useMergeAnim.js'
import { shuffle, showFlash } from '../utils.js'
import GC from '../../config/gameConfig.json'

const { CASH_OUT_PRICE } = GC

export function useEventActions({
  playerItems, backpackItems, gold, mergeFlash,
  findFreeSlot, findFreeBackpackSlot, mkInst,
  deliverRewards, playMergeAnimation, playDiceAnimation, afterEventAction,
  upgradeEventTag,
}) {

  // ── 工具：从阵容或背包中移除物品实例 ────────────────────────
  function removeItemInst(inst) {
    let idx = playerItems.findIndex(i => i.instanceId === inst.instanceId)
    if (idx !== -1) { playerItems.splice(idx, 1); return }
    idx = backpackItems.findIndex(i => i.instanceId === inst.instanceId)
    if (idx !== -1) backpackItems.splice(idx, 1)
  }

  // ── 升级 ──────────────────────────────────────────────────
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

  // ── 以物换物 ──────────────────────────────────────────────
  function doExchange(inst) {
    const pool = ITEM_POOL.filter(i => i.id !== inst.id)
    const shuffled = [...pool]; shuffle(shuffled)
    const base = shuffled[0]
    if (!base) { afterEventAction(); return }
    const tierStats = base.tiers?.[inst.tier] || {}

    // 移除被交换的物品，记录来源
    let inPlayer = false
    const pIdx = playerItems.findIndex(i => i.instanceId === inst.instanceId)
    if (pIdx !== -1) { playerItems.splice(pIdx, 1); inPlayer = true }
    else {
      const bIdx = backpackItems.findIndex(i => i.instanceId === inst.instanceId)
      if (bIdx !== -1) backpackItems.splice(bIdx, 1)
    }

    // 检查是否已有同 id+tier 物品可合成
    const existing = playerItems.find(i => i.id === base.id && i.tier === inst.tier && i.stack < GC.MERGE_THRESHOLD)
      ?? backpackItems.find(i => i.id === base.id && i.tier === inst.tier && i.stack < GC.MERGE_THRESHOLD)
    if (existing) {
      incrementStack(existing)
    } else {
      const newInst = mkInst({ ...base, tier: inst.tier, ...tierStats }, inst.col, inst.row ?? 0)
      if (inPlayer) playerItems.splice(pIdx, 0, newInst)
      else backpackItems.push(newInst)
    }

    showFlash(mergeFlash, `${inst.name_cn} → ${base.name_cn}！`)
    afterEventAction()
  }

  // ── 残骸搜寻选取 ──────────────────────────────────────────
  async function doWreckSelect(item) {
    await deliverRewards([item])
    afterEventAction()
  }

  // ── 变现 ──────────────────────────────────────────────────
  function doCashOut(inst) {
    removeItemInst(inst)
    const earned = CASH_OUT_PRICE[inst.tier] ?? 1
    gold.value += earned
    showFlash(mergeFlash, `💰 变现 +${earned} 金`)
    afterEventAction()
  }

  // ── 炼金 ──────────────────────────────────────────────────
  async function doAlchemyConfirm(selectedInsts) {
    for (const inst of selectedInsts) removeItemInst(inst)
    const pool = ITEM_POOL.filter(i => i.tiers?.Gold); shuffle(pool)
    const base = pool[0]
    if (base) await deliverRewards([{ ...base, tier: 'Gold', ...(base.tiers.Gold || {}) }])
    afterEventAction()
  }

  // ── 赌徒骰子 ──────────────────────────────────────────────
  function doGamblerDice(inst) {
    const isWin  = Math.random() < 0.5
    const base   = findItem(inst.id)
    if (!base) { afterEventAction(); return }

    const fromTier = inst.tier
    if (isWin) {
      const toTier    = nextTierOf(fromTier)
      const tierStats = base.tiers?.[toTier]
      playDiceAnimation({ inst, isWin: true, isDestroy: false, fromTier, toTier, base, tierStats, onComplete: afterEventAction })
    } else {
      const tierIdx = TIER_ORDER.indexOf(fromTier)
      if (tierIdx === 0) {
        playDiceAnimation({
          inst, isWin: false, isDestroy: true,
          fromTier, toTier: null, base, tierStats: null,
          onComplete: () => { removeItemInst(inst); afterEventAction() },
        })
      } else {
        const toTier    = TIER_ORDER[tierIdx - 1]
        const tierStats = base.tiers?.[toTier]
        playDiceAnimation({ inst, isWin: false, isDestroy: false, fromTier, toTier, base, tierStats, onComplete: afterEventAction })
      }
    }
  }

  // ── 各事件 computed（供 screen 组件 props）────────────────
  const allItems = computed(() => [...playerItems, ...backpackItems])

  const upgradeableItems = computed(() => {
    if (!upgradeEventTag.value) return []
    return allItems.value.filter(i =>
      i.tags?.includes(upgradeEventTag.value) &&
      TIER_ORDER.indexOf(i.tier) < TIER_ORDER.length - 1
    )
  })
  const bronzeItems        = computed(() => allItems.value.filter(i => i.tier === 'Bronze'))
  const exchangeableItems  = allItems
  const cashOutItems       = allItems
  const alchemyBronzeItems = bronzeItems
  const gamblerItems       = allItems

  return {
    doUpgrade, doExchange,
    doWreckSelect, doCashOut, doAlchemyConfirm, doGamblerDice,
    upgradeableItems, exchangeableItems,
    cashOutItems, alchemyBronzeItems, gamblerItems,
  }
}

// ── 条件检查（供 useEventSystem 使用）────────────────────────
export function checkEventCondition(eventId, { playerItems, backpackItems, findFreeSlot, findFreeBackpackSlot, gold }) {
  const allItems = [...playerItems, ...backpackItems]

  if (eventId === 'wreck_search') {
    return allItems.length > 0
  }
  if (eventId === 'storm_shuffle') {
    return allItems.length >= 2
  }
  if (eventId === 'cash_out') {
    return allItems.length > 0
  }
  if (eventId === 'tavern_gamble') {
    return (gold?.value ?? 0) >= GC.TAVERN_COST
  }
  if (eventId === 'black_market') {
    return (gold?.value ?? 0) >= GC.BLACK_MARKET_COST
  }
  if (eventId === 'alchemy') {
    return allItems.filter(i => i.tier === 'Bronze').length >= 3
  }
  if (eventId === 'gambler_dice') {
    return allItems.length > 0
  }
  return true
}
