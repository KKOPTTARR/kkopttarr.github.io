import { reactive } from 'vue'
import { TIER_ORDER, nextTierLabel } from '../data/tiers.js'
import { findItem, getIconUrl } from '../data/items.js'
import GC from '../../config/gameConfig.json'

// 单例状态（供 App.vue template 直接 reactive 监听）
export const mergeAnim = reactive({
  active: false, imgUrl: '', tier: '', cardClass: '', label: '',
})

let _mergeTimers = []

export function playMergeAnimation(inst, fromTier, toTier, base, tierStats, onComplete) {
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

export function incrementStack(inst) {
  inst.stack = (inst.stack || 1) + 1
  if (inst.stack >= GC.MERGE_THRESHOLD) {
    const nextTier = TIER_ORDER[TIER_ORDER.indexOf(inst.tier) + 1]
    if (nextTier) {
      const base = findItem(inst.id)
      const tierStats = base?.tiers?.[nextTier]
      if (tierStats) playMergeAnimation(inst, inst.tier, nextTier, base, tierStats)
    } else {
      inst.stack = 1
    }
  }
}
