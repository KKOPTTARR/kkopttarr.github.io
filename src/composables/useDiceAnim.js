import { reactive } from 'vue'

// 单例状态（供 DiceAnimOverlay 直接 reactive 监听）
export const diceAnim = reactive({
  active:    false,
  diceFace:  '⚄',   // Unicode 骰子 emoji，滚动中随机切换
  faceValue: 0,      // 最终点数 1-6，落定后显示
  diceClass: '',     // CSS class 控制动画状态
  result:    '',     // '' | 'win' | 'lose'
  label:     '',     // 结果文字
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
 * playDiceAnimation({ face, label, isWin, onComplete })
 *
 * face:       实际落定点数 1-6
 * label:      结果说明文字
 * isWin:      true = 好结果（金色），false = 坏结果（红色）
 * onComplete: 动画结束后回调（执行实际物品变更 + afterEventAction）
 */
export function playDiceAnimation({ face, label, isWin, onComplete }) {
  clearAll()

  Object.assign(diceAnim, {
    active:    true,
    diceFace:  FACES[Math.floor(Math.random() * 6)],
    faceValue: 0,
    diceClass: 'dice-spinning',
    result:    '',
    label:     '',
  })

  let faceIdx = FACES.indexOf(diceAnim.diceFace)

  function roll(n) {
    faceIdx = (faceIdx + 1) % 6
    diceAnim.diceFace = FACES[faceIdx]

    const MAX = 16
    if (n < MAX) {
      const delay = n < 10 ? 60 : 60 + (n - 10) * 60
      _rollHandle = setTimeout(() => roll(n + 1), delay)
    } else {
      // 落定在真实点数
      diceAnim.diceFace  = FACES[face - 1]
      diceAnim.faceValue = face
      diceAnim.diceClass = 'dice-land'
      at(380, () => revealResult())
    }
  }

  roll(0)

  function revealResult() {
    diceAnim.result    = isWin ? 'win' : 'lose'
    diceAnim.diceClass = isWin ? 'dice-win' : 'dice-lose'
    at(300, () => { diceAnim.label = label })
    at(2000, () => exit())
  }

  function exit() {
    diceAnim.diceClass = 'dice-exit'
    at(450, () => {
      Object.assign(diceAnim, { active: false, result: '', label: '', diceClass: '', faceValue: 0 })
      onComplete?.()
    })
  }
}
