import { reactive } from 'vue'
import { ITEM_POOL } from '../data/items.js'
import { mkInst } from './useInventory.js'
import { incrementStack } from './useMergeAnim.js'
import { shuffle, sleep } from '../utils.js'
import REWARD_WEIGHTS from '../../config/rewards.json'
import GC from '../../config/gameConfig.json'

// 单例动画状态（供 App.vue template 直接监听）
export const rewardAnim = reactive({ active: false, items: [], phase: '' })

function rollTier(cfg) {
  const r = Math.random() * 100
  if (r < cfg.Bronze) return 'Bronze'
  if (r < cfg.Bronze + cfg.Silver) return 'Silver'
  return 'Gold'
}

export function rollRewardItems(difficulty, isWin) {
  if (!isWin) {
    const pool = [...ITEM_POOL]; shuffle(pool)
    const base = pool[0]
    return [{ ...base, tier: 'Bronze', ...base.tiers?.Bronze }]
  }
  const cfg = REWARD_WEIGHTS[difficulty] ?? REWARD_WEIGHTS.normal
  const result = []
  for (let i = 0; i < cfg.count; i++) {
    const tier = rollTier(cfg)
    const candidates = ITEM_POOL.filter(item => item.tiers?.[tier])
    const shuffled = [...candidates]; shuffle(shuffled)
    const base = shuffled[i % shuffled.length]
    result.push({ ...base, tier, ...base.tiers?.[tier] })
  }
  return result
}

export function useRewards({ playerItems, backpackItems, findFreeSlot, findFreeBackpackSlot }) {
  async function deliverRewards(items) {
    if (!items.length) return
    for (const item of items) {
      const existing = playerItems.find(i => i.id === item.id && i.tier === item.tier && i.stack < GC.MERGE_THRESHOLD)
        ?? backpackItems.find(i => i.id === item.id && i.tier === item.tier && i.stack < GC.MERGE_THRESHOLD)
      if (existing) {
        incrementStack(existing)
        continue
      }
      const fs = findFreeSlot()
      if (fs) {
        playerItems.push(mkInst(item, fs.col, fs.row))
      } else {
        const bps = findFreeBackpackSlot()
        if (bps) backpackItems.push(mkInst(item, bps.col, bps.row))
      }
    }
    rewardAnim.items = items
    rewardAnim.active = true
    rewardAnim.phase = 'show'
    await sleep(500)
    rewardAnim.phase = 'fly'
    await sleep(items.length * 150 + 500)
    rewardAnim.active = false
  }

  return { deliverRewards }
}
