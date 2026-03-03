import { ref } from 'vue'
import { ITEM_POOL, findItem } from '../data/items.js'
import { TIER_ORDER } from '../data/tiers.js'
import { EVENT_POOL } from '../data/config.js'
import { checkEventCondition } from './useEventActions.js'
import { shuffle, showFlash } from '../utils.js'
import GC from '../../config/gameConfig.json'

const {
  EVENTS_PER_ROUND, EVENT_NORMAL_COUNT, EVENT_LAST_NORMAL_COUNT,
  SHOP_ROUNDS, SHOP_SLOTS, STORM_SHIELD,
  TAVERN_COST, TAVERN_WIN_GOLD, BLACK_MARKET_COST,
} = GC

export function useEventSystem({
  phase, battleCount,
  playerItems, backpackItems,
  gold, mergeFlash,
  shopSlots, showBackpack,
  findFreeSlot, findFreeBackpackSlot,
  deliverRewards,
}) {
  const pendingEvents       = ref(0)
  const eventKey            = ref(0)
  const eventOptions        = ref([])
  const stormBlessingActive = ref(false)
  const upgradeEventTag     = ref(null)
  const wreckCandidates     = ref([])

  // ── 事件流程控制 ──────────────────────────────────────────

  function afterEventAction() {
    showBackpack.value = false
    phase.value = 'ARRANGE'
  }

  function continueEventRound() {
    prepareEventOptions()
    eventKey.value++
    phase.value = 'EVENT'
  }

  // 在 onResultNext 中调用，开启一轮事件（直接进 EVENT）
  function startEventRound() {
    pendingEvents.value = EVENTS_PER_ROUND
    continueEventRound()
  }

  // 在 onIdentityChoice 中调用，先进 ARRANGE 再开始事件轮
  function beginEventRound() {
    pendingEvents.value = EVENTS_PER_ROUND
    showBackpack.value = false
    phase.value = 'ARRANGE'
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
    if (e.id === 'shop') {
      const allTags = [...new Set(ITEM_POOL.flatMap(i => i.tags || []))]
      shuffle(allTags)
      const tags = allTags.slice(0, 3)
      const taggedPool = ITEM_POOL.filter(i => i.tags?.some(t => tags.includes(t)))
      const shuffledPool = [...taggedPool]; shuffle(shuffledPool)
      shopSlots.length = 0
      shuffledPool.slice(0, SHOP_SLOTS).forEach(item => shopSlots.push(item))
      return { ...e, desc: tags.join(' · ') }
    }
    if (e.id === 'exchange') {
      if (!allItems.length) return null
      return { ...e }
    }
    if (e.id === 'wreck_search') {
      if (!allItems.length) return null
      const tagCount = {}
      for (const item of allItems)
        for (const tag of (item.tags || [])) tagCount[tag] = (tagCount[tag] || 0) + 1
      if (!Object.keys(tagCount).length) return null
      const maxCount = Math.max(...Object.values(tagCount))
      const topTags = Object.keys(tagCount).filter(t => tagCount[t] === maxCount)
      shuffle(topTags)
      const tag = topTags[0]
      const pool = ITEM_POOL.filter(i => i.tags?.includes(tag)); shuffle(pool)
      if (!pool.length) return null
      wreckCandidates.value = pool.slice(0, 3).map(base => ({ ...base, tier: 'Bronze', ...(base.tiers?.Bronze || {}) }))
      return { ...e, desc: `打捞「${tag}」类铜质宝物，三选一` }
    }
    if (e.id === 'storm_blessing') {
      return { ...e, desc: `下一场开场获得 ${STORM_SHIELD} 点临时护盾` }
    }
    if (e.id === 'tavern_gamble') {
      const ok = checkEventCondition('tavern_gamble', { playerItems, backpackItems, findFreeSlot, findFreeBackpackSlot, gold })
      if (!ok) return null
      return { ...e, desc: `花费 ${TAVERN_COST} 金参与赌局，50% 赢回 ${TAVERN_WIN_GOLD} 金` }
    }
    if (e.id === 'black_market') {
      const ok = checkEventCondition('black_market', { playerItems, backpackItems, findFreeSlot, findFreeBackpackSlot, gold })
      if (!ok) return null
      return { ...e, desc: `花费 ${BLACK_MARKET_COST} 金，获得一件随机银质物品` }
    }
    if (['cash_out', 'alchemy', 'gambler_dice', 'storm_shuffle'].includes(e.id)) {
      const ok = checkEventCondition(e.id, { playerItems, backpackItems, findFreeSlot, findFreeBackpackSlot, gold })
      if (!ok) return null
      return { ...e }
    }
    return { ...e }
  }

  function prepareEventOptions() {
    const isLastEvent = pendingEvents.value === 1
    const result = []

    const normalPool = EVENT_POOL.filter(e => e.pool === 'normal')
    const shuffled = [...normalPool]; shuffle(shuffled)
    const targetNormal = isLastEvent ? EVENT_LAST_NORMAL_COUNT : EVENT_NORMAL_COUNT
    for (const e of shuffled) {
      if (result.length >= targetNormal) break
      const opt = prepareEventOption(e)
      if (opt) result.push(opt)
    }

    // 固定轮次商店：第4轮和第8轮的第一个事件必然出现商店选项
    if (pendingEvents.value === EVENTS_PER_ROUND && SHOP_ROUNDS.includes(battleCount.value)) {
      const shopEvent = EVENT_POOL.find(e => e.id === 'shop')
      if (shopEvent) {
        const opt = prepareEventOption(shopEvent)
        if (opt) result.push(opt)
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
    if (eventId === 'upgrade')        { phase.value = 'UPGRADE'; return }
    if (eventId === 'shop')           { showBackpack.value = false; pendingEvents.value = 0; phase.value = 'SHOP'; return }
    if (eventId === 'exchange')       { phase.value = 'EXCHANGE'; return }
    if (eventId === 'storm_blessing') { stormBlessingActive.value = true; afterEventAction(); return }
    if (eventId === 'wreck_search')   { phase.value = 'WRECK_SEARCH'; return }
    if (eventId === 'cash_out')       { phase.value = 'CASH_OUT'; return }
    if (eventId === 'tavern_gamble')  { _doTavernGamble(); return }
    if (eventId === 'black_market')   { _doBlackMarket(); return }
    if (eventId === 'alchemy')        { phase.value = 'ALCHEMY'; return }
    if (eventId === 'gambler_dice')   { phase.value = 'GAMBLER'; return }
    if (eventId === 'storm_shuffle')  { _doStormShuffle(); return }
  }

  // ── 直接执行的事件（无需独立 Screen）────────────────────────

  function _doTavernGamble() {
    gold.value -= TAVERN_COST
    const win = Math.random() < 0.5
    if (win) {
      gold.value += TAVERN_WIN_GOLD
      showFlash(mergeFlash, `🎰 赌赢了！+${TAVERN_WIN_GOLD} 金`, 2000)
    } else {
      showFlash(mergeFlash, `🎰 运气不佳，损失 ${TAVERN_COST} 金`, 2000)
    }
    afterEventAction()
  }

  async function _doBlackMarket() {
    gold.value -= BLACK_MARKET_COST
    const pool = [...ITEM_POOL].filter(i => i.tiers?.Silver)
    shuffle(pool)
    const base = pool[0]
    if (base) await deliverRewards([{ ...base, tier: 'Silver', ...(base.tiers?.Silver || {}) }])
    afterEventAction()
  }

  function _doStormShuffle() {
    const allItems = [...playerItems, ...backpackItems]
    if (allItems.length < 2) { afterEventAction(); return }
    const tiers = allItems.map(i => i.tier)
    shuffle(tiers)
    for (let i = 0; i < allItems.length; i++) {
      const inst = allItems[i]
      const newTier = tiers[i]
      if (newTier === inst.tier) continue
      const base = findItem(inst.id)
      const tierStats = base?.tiers?.[newTier]
      if (!tierStats) continue
      inst.tier = newTier
      Object.assign(inst, tierStats)
    }
    afterEventAction()
  }

  return {
    pendingEvents, eventKey, eventOptions,
    stormBlessingActive, upgradeEventTag, wreckCandidates,
    afterEventAction, onEventChoice, startEventRound, continueEventRound, beginEventRound,
  }
}
