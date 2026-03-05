import { computed } from 'vue'
import { ITEM_POOL, findItem } from '../data/items.js'
import { TIER_ORDER, TIER_LABELS, nextTierOf } from '../data/tiers.js'
import { applyRandomEffect } from '../data/specialEffects.js'
import { incrementStack } from './useMergeAnim.js'
import { shuffle, showFlash } from '../utils.js'
import GC from '../../config/gameConfig.json'

export function useEventActions({
  playerItems, backpackItems, mergeFlash,
  findFreeSlot, findFreeBackpackSlot, mkInst,
  deliverRewards, playMergeAnimation, playDiceAnimation, afterEventAction,
  upgradeEventTag, breakBoatsBuff,
  lives, maxLives,
  exchangeFromType, exchangeToType,
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
    const nextTier = nextTierOf(inst.tier)
    if (nextTier === inst.tier) return
    const base = findItem(inst.id)
    const tierStats = base?.tiers?.[nextTier]
    if (!tierStats) return
    playMergeAnimation(inst, inst.tier, nextTier, base, tierStats, afterEventAction)
  }

  // ── 以物换物 ──────────────────────────────────────────────
  function doExchange(inst) {
    const toType = exchangeToType?.value
    const pool = ITEM_POOL.filter(i => i.id !== inst.id && (!toType || i.tags?.includes(toType)))
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

  // ── 宝藏商店选取 ──────────────────────────────────────────
  async function doShopSelect(item) {
    await deliverRewards([item])
    afterEventAction()
  }

  // ── 炼金 ──────────────────────────────────────────────────
  async function doAlchemyConfirm(selectedInsts) {
    for (const inst of selectedInsts) removeItemInst(inst)
    const inputTier  = selectedInsts[0]?.tier ?? 'Bronze'
    const outputTier = nextTierOf(inputTier)
    const pool = ITEM_POOL.filter(i => i.tiers?.[outputTier]); shuffle(pool)
    const base = pool[0]
    if (base) await deliverRewards([{ ...base, tier: outputTier, ...(base.tiers[outputTier] || {}) }])
    afterEventAction()
  }

  // ── 深锚强化 ──────────────────────────────────────────────
  function doDeepAnchor(inst) {
    const effect = applyRandomEffect(inst)
    showFlash(mergeFlash, `${inst.name_cn} 获得「${effect.label}」！`)
    afterEventAction()
  }

  // ── 破釜沉舟 ──────────────────────────────────────────────
  function doBreakBoats() {
    const loss = Math.max(1, Math.ceil(maxLives * 0.2))
    lives.value = Math.max(1, lives.value - loss)
    const effects = playerItems.map(applyRandomEffect)
    const labels = [...new Set(effects.map(e => e.label))].join('、')
    showFlash(mergeFlash, `阵容获得：${labels}！`)
    afterEventAction()
  }

  // ── 蒙面交易选取 ──────────────────────────────────────────
  async function doBlindTradeSelect(item) {
    await deliverRewards([item])
    afterEventAction()
  }

  // ── 酒馆赌注（猜大小）──────────────────────────────────────
  function doTavernGamble(guess) {
    const allItems = [...playerItems, ...backpackItems]
    if (!allItems.length) { afterEventAction(); return }
    const face   = Math.floor(Math.random() * 6) + 1
    const actual = face <= 3 ? 'low' : 'high'
    const win    = guess === actual

    const pool = [...allItems]
    shuffle(pool)
    const item = pool[0]

    if (win) {
      if (item.tier === 'Diamond') {
        playDiceAnimation({ face, isWin: true, label: `猜对了！${item.name_cn} 已是最高品质！`, onComplete: afterEventAction })
        return
      }
      const toTier = nextTierOf(item.tier)
      playDiceAnimation({
        face, isWin: true,
        label: `猜对了！${item.name_cn} 升至${TIER_LABELS[toTier]}质！`,
        onComplete: () => {
          const base = findItem(item.id)
          const tierStats = base?.tiers?.[toTier]
          if (tierStats) { item.tier = toTier; Object.assign(item, tierStats) }
          afterEventAction()
        },
      })
    } else {
      if (item.tier === 'Bronze') {
        playDiceAnimation({
          face, isWin: false,
          label: `猜错了！${item.name_cn} 化为灰烬！`,
          onComplete: () => { removeItemInst(item); afterEventAction() },
        })
      } else {
        const toTier = TIER_ORDER[TIER_ORDER.indexOf(item.tier) - 1]
        playDiceAnimation({
          face, isWin: false,
          label: `猜错了！${item.name_cn} 降至${TIER_LABELS[toTier]}质`,
          onComplete: () => {
            const base = findItem(item.id)
            const tierStats = base?.tiers?.[toTier]
            if (tierStats) { item.tier = toTier; Object.assign(item, tierStats) }
            afterEventAction()
          },
        })
      }
    }
  }

  // ── 赌徒骰子 ──────────────────────────────────────────────
  function doGamblerDice() {
    const face     = Math.floor(Math.random() * 6) + 1
    const allItems = [...playerItems, ...backpackItems]

    if (!allItems.length) { afterEventAction(); return }

    if (face === 1) {
      // 随机销毁一件物品
      const pool = [...allItems]; shuffle(pool)
      const target = pool[0]
      playDiceAnimation({
        face, isWin: false,
        label: `💀 ${target.name_cn} 化为灰烬！`,
        onComplete: () => { removeItemInst(target); afterEventAction() },
      })

    } else if (face === 2) {
      // 随机一件物品降一品质（若全为铜质则销毁一件）
      const downgradeable = allItems.filter(i => TIER_ORDER.indexOf(i.tier) > 0)
      if (!downgradeable.length) {
        const pool = [...allItems]; shuffle(pool)
        const target = pool[0]
        playDiceAnimation({
          face, isWin: false,
          label: `💀 ${target.name_cn} 化为灰烬！`,
          onComplete: () => { removeItemInst(target); afterEventAction() },
        })
        return
      }
      shuffle(downgradeable)
      const target   = downgradeable[0]
      const toTier   = TIER_ORDER[TIER_ORDER.indexOf(target.tier) - 1]
      const base     = findItem(target.id)
      const tierStats = base?.tiers?.[toTier]
      playDiceAnimation({
        face, isWin: false,
        label: `↓ ${target.name_cn} 降至${TIER_LABELS[toTier]}质`,
        onComplete: () => {
          if (tierStats) { target.tier = toTier; Object.assign(target, tierStats) }
          afterEventAction()
        },
      })

    } else if (face === 3) {
      // 随机替换一件物品为同品质另一件
      const pool = [...allItems]; shuffle(pool)
      const target = pool[0]
      const tier   = target.tier
      const candidates = ITEM_POOL.filter(b => b.tiers?.[tier] && b.id !== target.id)
      shuffle(candidates)
      const newBase = candidates[0]
      if (!newBase) {
        playDiceAnimation({ face, isWin: false, label: '没有可替换的物品', onComplete: afterEventAction })
        return
      }
      playDiceAnimation({
        face, isWin: true,
        label: `🔄 ${target.name_cn} → ${newBase.name_cn}`,
        onComplete: () => {
          const tierStats = newBase.tiers[tier] || {}
          const { instanceId, col, row, stack } = target
          Object.assign(target, newBase, tierStats, { instanceId, col, row, tier, stack: stack ?? 1 })
          afterEventAction()
        },
      })

    } else {
      // face 4/5/6：随机升品质 N 件
      const n            = face - 3
      const upgradeable  = allItems.filter(i => i.tier !== 'Diamond')
      shuffle(upgradeable)
      const targets = upgradeable.slice(0, n)
      if (!targets.length) {
        playDiceAnimation({ face, isWin: true, label: '⭐ 所有物品已是钻石品质！', onComplete: afterEventAction })
        return
      }
      const names = targets.map(t => t.name_cn).join('、')
      playDiceAnimation({
        face, isWin: true,
        label: `⭐ ${names} 升品质！`,
        onComplete: () => {
          for (const target of targets) {
            const toTier    = nextTierOf(target.tier)
            if (toTier === target.tier) continue
            const base      = findItem(target.id)
            const tierStats = base?.tiers?.[toTier]
            if (tierStats) { target.tier = toTier; Object.assign(target, tierStats) }
          }
          afterEventAction()
        },
      })
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
  const exchangeableItems = computed(() => {
    const fromType = exchangeFromType?.value
    if (!fromType) return allItems.value
    return allItems.value.filter(i => i.tags?.includes(fromType))
  })
  const alchemyItems      = computed(() => allItems.value.filter(i => i.tier !== 'Diamond'))

  return {
    doUpgrade, doExchange,
    doWreckSelect, doAlchemyConfirm, doGamblerDice, doShopSelect,
    doDeepAnchor, doBreakBoats, doBlindTradeSelect, doTavernGamble,
    upgradeableItems, exchangeableItems, alchemyItems,
  }
}

// ── 条件检查（供 useEventSystem 使用）────────────────────────
export function checkEventCondition(eventId, { playerItems, backpackItems, findFreeSlot, findFreeBackpackSlot }) {
  const allItems = [...playerItems, ...backpackItems]

if (eventId === 'storm_shuffle') {
    return allItems.length >= 2
  }
  if (eventId === 'alchemy') {
    return TIER_ORDER.slice(0, -1).some(tier =>
      allItems.filter(i => i.tier === tier).length >= 3
    )
  }
  if (['gambler_dice', 'deep_anchor', 'break_boats', 'tavern_gamble'].includes(eventId)) {
    return allItems.length > 0
  }
  return true
}
