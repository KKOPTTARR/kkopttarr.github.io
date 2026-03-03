import { reactive } from 'vue'
import { getIconUrl } from '../data/items.js'
import { TIER_LABELS } from '../data/tiers.js'

// 单例状态（供 App.vue template 直接 reactive 监听）
export const diceAnim = reactive({
  active:    false,
  imgUrl:    '',
  tier:      '',
  diceFace:  '⚅',
  diceClass: '',    // CSS class on dice emoji
  result:    '',    // '' | 'win' | 'lose' | 'destroy'
  label:     '',
  cardClass: '',
})

const FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅']
let _timers = []
let _rollHandle = null

function clearAll() {
  _timers.forEach(clearTimeout)
  _timers = []
  if (_rollHandle) { clearTimeout(_rollHandle); _rollHandle = null }
}

function at(ms, fn) { _timers.push(setTimeout(fn, ms)) }

/**
 * playDiceAnimation({ inst, isWin, isDestroy, fromTier, toTier, base, tierStats, onComplete })
 *
 * isWin:      true = upgrade / no-change (Diamond)
 * isDestroy:  true = Bronze lose (item destroyed)
 * fromTier:   current tier string
 * toTier:     target tier string (null for destroy)
 * base:       item base config
 * tierStats:  stats object for toTier (null for destroy / max-tier)
 * onComplete: called after animation finishes
 */
export function playDiceAnimation({ inst, isWin, isDestroy, fromTier, toTier, base, tierStats, onComplete }) {
  clearAll()

  Object.assign(diceAnim, {
    active:    true,
    imgUrl:    getIconUrl(base.name_en, fromTier),
    tier:      fromTier,
    diceFace:  FACES[Math.floor(Math.random() * 6)],
    diceClass: '',
    result:    '',
    label:     '',
    cardClass: 'ma-enter',
  })

  // Phase 1: 卡牌弹入 (0-450ms)，然后骰子开始转动
  at(450, () => {
    diceAnim.cardClass = ''
    diceAnim.diceClass = 'dice-spinning'
    let faceIdx = FACES.indexOf(diceAnim.diceFace)
    roll(0, faceIdx)
  })

  function roll(n, faceIdx) {
    // 前 10 次快速 (65ms)，后续逐渐减速
    const MAX = 14
    faceIdx = (faceIdx + 1) % 6
    diceAnim.diceFace = FACES[faceIdx]

    if (n < MAX) {
      const delay = n < 10 ? 65 : 65 + (n - 10) * 55
      _rollHandle = setTimeout(() => roll(n + 1, faceIdx), delay)
    } else {
      // 落定：⚅ 代表赢，⚀ 代表输
      diceAnim.diceFace  = isWin ? '⚅' : '⚀'
      diceAnim.diceClass = 'dice-land'
      at(350, () => revealResult())
    }
  }

  function revealResult() {
    diceAnim.result    = isWin ? 'win' : isDestroy ? 'destroy' : 'lose'
    diceAnim.diceClass = isWin ? 'dice-win' : 'dice-lose'

    if (isWin && toTier !== fromTier) {
      // ── 升品：翻牌揭晓 ──
      at(200, () => { diceAnim.cardClass = 'ma-flip-out' })
      at(450, () => {
        diceAnim.imgUrl    = getIconUrl(base.name_en, toTier)
        diceAnim.tier      = toTier
        inst.tier          = toTier
        Object.assign(inst, tierStats)
        inst.stack         = 1
        diceAnim.cardClass = 'ma-flip-in'
      })
      at(700, () => {
        diceAnim.cardClass = ''
        diceAnim.label     = `${base.name_cn} 升至 ${TIER_LABELS[toTier]} 质！`
      })
      at(1600, () => exit())

    } else if (isWin) {
      // ── 已是钻石，气运无处发挥 ──
      diceAnim.label = `${base.name_cn} 已是钻石，气运爆棚！`
      at(1500, () => exit())

    } else if (isDestroy) {
      // ── 铜质物品化为灰烬 ──
      at(100, () => { diceAnim.cardClass = 'ma-shake' })
      at(450, () => {
        diceAnim.cardClass = 'ma-exit'
        diceAnim.label     = `${base.name_cn} 化为灰烬`
      })
      at(1000, () => exit())

    } else {
      // ── 降品：抖动 + 翻牌 ──
      at(100, () => { diceAnim.cardClass = 'ma-shake' })
      at(450, () => { diceAnim.cardClass = 'ma-flip-out' })
      at(700, () => {
        diceAnim.imgUrl    = getIconUrl(base.name_en, toTier)
        diceAnim.tier      = toTier
        inst.tier          = toTier
        Object.assign(inst, tierStats)
        diceAnim.cardClass = 'ma-flip-in'
      })
      at(950, () => {
        diceAnim.cardClass = ''
        diceAnim.label     = `${base.name_cn} 降至 ${TIER_LABELS[toTier]} 质`
      })
      at(1700, () => exit())
    }
  }

  function exit() {
    diceAnim.cardClass = 'ma-exit'
    diceAnim.diceClass = ''
    at(500, () => {
      Object.assign(diceAnim, { active: false, result: '', label: '', cardClass: '' })
      onComplete?.()
    })
  }
}
