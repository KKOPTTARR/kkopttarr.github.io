import { ref } from 'vue'
import { ITEM_POOL, findItem } from '../data/items.js'
import { TIER_ORDER } from '../data/tiers.js'
import { EVENT_POOL } from '../data/config.js'
import { checkEventCondition } from './useEventActions.js'
import { getChapterEventWeights, getChapterNumber } from './useSkills.js'
import { applyRandomEffect } from '../data/specialEffects.js'
import { shuffle, showFlash } from '../utils.js'
import GC from '../../config/gameConfig.json'

const {
  EVENTS_PER_ROUND, EVENT_NORMAL_COUNT, EVENT_LAST_NORMAL_COUNT,
  STORM_SHIELD, SHOP_EVENT_COUNT, SHOP_TIER_WEIGHTS, SHOP_TIER_WEIGHTS_FLOOR,
  RARE_EVENT_CHANCE, WRECK_TIER_WEIGHTS_BY_BATTLE,
} = GC

const TIER_FLOOR_ORDER = ['Bronze', 'Silver', 'Gold', 'Diamond']

function getShopTierWeights(allItems) {
  if (!allItems.length) return SHOP_TIER_WEIGHTS
  const highestIdx = Math.max(...allItems.map(i => TIER_FLOOR_ORDER.indexOf(i.tier)))
  const floorTier  = TIER_FLOOR_ORDER[highestIdx] ?? 'Bronze'
  return SHOP_TIER_WEIGHTS_FLOOR[floorTier] ?? SHOP_TIER_WEIGHTS
}

function getWreckTierWeights(battleCount) {
  const sorted = [...WRECK_TIER_WEIGHTS_BY_BATTLE].sort((a, b) => b.minBattle - a.minBattle)
  const entry = sorted.find(e => battleCount >= e.minBattle)
  return entry?.weights ?? { Bronze: 100, Silver: 0, Gold: 0, Diamond: 0 }
}

// 前两轮事件中：第一轮(pendingEvents===2)为战后，第二轮(pendingEvents===1)为战前
const PRE_EVENT_IDS  = new Set(['upgrade', 'alchemy', 'exchange', 'deep_anchor', 'combat_shield'])
const POST_EVENT_IDS = new Set(['wreck_search', 'storm_shuffle', 'gambler_dice', 'tavern_gamble', 'shop', 'break_boats', 'blind_trade'])

// 残骸搜寻：类型 → 颜色
export const WRECK_TYPE_COLORS = {
  '工具': '#5b8fce',
  '伙伴': '#68b868',
  '防具': '#6666cc',
  '食物': '#e8a030',
  '枪械': '#e05050',
  '武器': '#e06030',
  '载具': '#40c8c8',
  '科技': '#a060d0',
}

// 同组事件最多出现一个
const CONFLICT_GROUPS = [
  ['wreck_search', 'shop', 'blind_trade'],  // 获得新物品类
  ['gambler_dice', 'tavern_gamble'],         // 掷骰赌博类
  ['upgrade', 'alchemy'],                    // 品质提升类
]
function getConflictGroup(id) {
  return CONFLICT_GROUPS.find(g => g.includes(id)) ?? null
}

export function useEventSystem({
  phase, battleCount,
  playerItems, backpackItems,
  mergeFlash,
  showBackpack,
  findFreeSlot, findFreeBackpackSlot,
  deliverRewards,
}) {
  const pendingEvents        = ref(0)
  const eventKey             = ref(0)
  const eventOptions         = ref([])
  const eventOverlay         = ref(null)   // null | 'EVENT' | 'EXCHANGE' | ...
  const stormBlessingActive  = ref(false)
  const stormShieldAmount    = ref(0)
  const breakBoatsBuff       = ref(null)
  const upgradeEventTag      = ref(null)
  const exchangeFromType     = ref(null)
  const exchangeToType       = ref(null)
  const wreckCandidates      = ref([])
  const shopCandidates       = ref([])
  const blindTradeCandidates = ref([])

  // ── 事件流程控制 ──────────────────────────────────────────

  function afterEventAction() {
    showBackpack.value = false
    eventOverlay.value = null   // 关闭浮层，ARRANGE 始终在底层
  }

  function continueEventRound() {
    prepareEventOptions()
    eventKey.value++
    eventOverlay.value = 'EVENT'
  }

  // 战斗结束后调用：切回 ARRANGE 并立即弹出第一个事件浮层
  function startEventRound() {
    pendingEvents.value = EVENTS_PER_ROUND
    phase.value = 'ARRANGE'
    continueEventRound()
  }

  // 首次（身份选择后）：先进 ARRANGE 让玩家看初始物品，pendingEvents 留着等"继续"
  function beginEventRound() {
    pendingEvents.value = EVENTS_PER_ROUND
    showBackpack.value = false
    phase.value = 'ARRANGE'
  }

  // ── 宝藏商店候选生成 ──────────────────────────────────────

  function _weightedTier(weights) {
    const r = Math.random() * 100
    let cum = 0
    for (const tier of TIER_ORDER) {
      cum += weights[tier] ?? 0
      if (r < cum) return tier
    }
    return 'Bronze'
  }

  function generateShopCandidates() {
    const allItems = [...playerItems, ...backpackItems]
    const weights  = getShopTierWeights(allItems)
    const pool = [...ITEM_POOL]; shuffle(pool)
    const result = []
    for (const base of pool) {
      if (result.length >= SHOP_EVENT_COUNT) break
      const tier = _weightedTier(weights)
      if (!base.tiers?.[tier]) continue
      result.push({ ...base, tier, ...(base.tiers[tier] || {}) })
    }
    return result
  }

  function rerollShopCandidates() {
    shopCandidates.value = generateShopCandidates()
  }

  // ── 事件选项准备 ──────────────────────────────────────────

  function prepareEventOption(e) {
    const allItems = [...playerItems, ...backpackItems]
    if (e.id === 'upgrade') {
      const upgradeable = allItems.filter(i => TIER_ORDER.indexOf(i.tier) < TIER_ORDER.length - 1)
      const tags = [...new Set(upgradeable.flatMap(i => i.tags || []))]
      shuffle(tags)
      const tag = tags[0] ?? null
      if (!tag) return null
      upgradeEventTag.value = tag
      return { ...e, desc: `升级「${tag}」类物品` }
    }
    if (e.id === 'exchange') {
      if (!allItems.length) return null
      const fromTypes = [...new Set(allItems.flatMap(i => i.tags || []))]
      if (!fromTypes.length) return null
      shuffle(fromTypes)
      const fromType = fromTypes[0]
      const allPoolTypes = [...new Set(ITEM_POOL.flatMap(i => i.tags || []))]
      const toTypes = allPoolTypes.filter(t => t !== fromType)
      if (!toTypes.length) return null
      shuffle(toTypes)
      const toType = toTypes[0]
      exchangeFromType.value = fromType
      exchangeToType.value   = toType
      return { ...e, desc: `用一件「${fromType}」换取一件「${toType}」` }
    }
    if (e.id === 'wreck_search') {
      const weights = getWreckTierWeights(battleCount.value)
      const tier = _weightedTier(weights)
      const availableTypes = Object.keys(WRECK_TYPE_COLORS).filter(
        tag => ITEM_POOL.some(b => b.tags?.includes(tag) && b.tiers?.[tier])
      )
      if (!availableTypes.length) return null
      const type = availableTypes[Math.floor(Math.random() * availableTypes.length)]
      const pool = ITEM_POOL.filter(b => b.tags?.includes(type) && b.tiers?.[tier])
      const base = pool[Math.floor(Math.random() * pool.length)]
      wreckCandidates.value = [{ ...base, tier, ...(base.tiers?.[tier] || {}) }]
      const TIER_CN = { Bronze: '铜质', Silver: '银质', Gold: '金质', Diamond: '钻石' }
      return { ...e, desc: `从海底残骸中打捞一件${TIER_CN[tier] ?? ''}「${type}」` }
    }
    if (e.id === 'shop') {
      shopCandidates.value = generateShopCandidates()
      return { ...e }
    }
    if (e.id === 'blind_trade') {
      blindTradeCandidates.value = generateShopCandidates()
      return { ...e }
    }
    if (e.id === 'combat_shield') {
      const amount = STORM_SHIELD * getChapterNumber(battleCount.value)
      return { ...e, desc: `下一场战斗开始时，获得 ${amount} 点临时护盾` }
    }
    if (['alchemy', 'gambler_dice', 'storm_shuffle', 'deep_anchor', 'break_boats', 'tavern_gamble'].includes(e.id)) {
      const ok = checkEventCondition(e.id, { playerItems, backpackItems, findFreeSlot, findFreeBackpackSlot })
      if (!ok) return null
      return { ...e }
    }
    return { ...e }
  }

  function prepareEventOptions() {
    const isLastEvent = pendingEvents.value === 1
    // 第一轮事件(pendingEvents===2)为战后池，第二轮(pendingEvents===1)为战前池
    const isPreEvent  = pendingEvents.value === 1
    const eventPhase  = isPreEvent ? 'pre' : 'post'
    const phasePool   = isPreEvent ? PRE_EVENT_IDS : POST_EVENT_IDS
    const chapterWeights = getChapterEventWeights(battleCount.value, eventPhase)

    const result = []
    // 按章节权重加权后洗牌
    const normalPool = EVENT_POOL.filter(e => e.pool === 'normal' && phasePool.has(e.id) && (chapterWeights[e.id] ?? 1) > 0)
    const weighted = []
    for (const e of normalPool) {
      const w = chapterWeights[e.id] ?? 1
      for (let i = 0; i < w; i++) weighted.push(e)
    }
    shuffle(weighted)
    // 去重（权重展开后可能重复）
    const seen = new Set()
    const deduped = weighted.filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true })

    const targetNormal = isLastEvent ? EVENT_LAST_NORMAL_COUNT : EVENT_NORMAL_COUNT
    const usedGroups = new Set()
    for (const e of deduped) {
      if (result.length >= targetNormal) break
      const group = getConflictGroup(e.id)
      if (group && usedGroups.has(group)) continue
      const opt = prepareEventOption(e)
      if (opt) {
        result.push(opt)
        if (group) usedGroups.add(group)
      }
    }

    // Rare pool：按概率替换最后一个普通选项（不额外增加选项数量）
    if (result.length > 0 && Math.random() < RARE_EVENT_CHANCE) {
      const rarePool = EVENT_POOL.filter(e => e.pool === 'rare' && phasePool.has(e.id) && (chapterWeights[e.id] ?? 1) > 0)
      shuffle(rarePool)
      for (const e of rarePool) {
        const opt = prepareEventOption(e)
        if (opt) { result[result.length - 1] = opt; break }
      }
    }

    if (isLastEvent) {
      EVENT_POOL
        .filter(e => e.pool === 'last' && e.guaranteed)
        .forEach(e => { const opt = prepareEventOption(e); if (opt) result.push(opt) })
    }

    eventOptions.value = result
  }

  // ── 事件选择分发 ──────────────────────────────────────────

  function onEventChoice(eventId) {
    pendingEvents.value--
    const e = EVENT_POOL.find(ev => ev.id === eventId)
    if (e?.targetPhase)     { eventOverlay.value = e.targetPhase; return }
    if (e?.immediateAction) { _runImmediateAction(e.immediateAction); return }
    afterEventAction()
  }

  // ── 直接执行的事件（无需独立 Screen）────────────────────────

  function _runImmediateAction(action) {
    if (action === 'stormShuffle') { _doStormShuffle(); return }
    if (action === 'combatShield') {
      stormShieldAmount.value = STORM_SHIELD * getChapterNumber(battleCount.value)
      stormBlessingActive.value = true
      afterEventAction()
      return
    }
    if (action === 'deepAnchor')   { _doDeepAnchor(); return }
  }

  function _doDeepAnchor() {
    const allItems = [...playerItems, ...backpackItems]
    if (!allItems.length) { afterEventAction(); return }
    shuffle(allItems)
    const target = allItems[0]
    const effect = applyRandomEffect(target)
    showFlash(mergeFlash, `${target.name_cn} 获得「${effect.label}」！`)
    afterEventAction()
  }

  function _doStormShuffle() {
    const allItems = [...playerItems, ...backpackItems]
    if (!allItems.length) { afterEventAction(); return }
    for (const inst of allItems) {
      const tier = inst.tier
      const pool = ITEM_POOL.filter(b => b.tiers?.[tier] && b.id !== inst.id)
      if (!pool.length) continue
      shuffle(pool)
      const newBase = pool[0]
      const tierStats = newBase.tiers[tier] || {}
      const { instanceId, col, row, stack } = inst
      Object.assign(inst, newBase, tierStats, { instanceId, col, row, tier, stack: stack ?? 1 })
    }
    afterEventAction()
  }

  return {
    pendingEvents, eventKey, eventOptions, eventOverlay,
    stormBlessingActive, stormShieldAmount, breakBoatsBuff,
    upgradeEventTag, exchangeFromType, exchangeToType,
    wreckCandidates, shopCandidates, blindTradeCandidates,
    afterEventAction, onEventChoice, rerollShopCandidates,
    startEventRound, continueEventRound, beginEventRound,
  }
}
