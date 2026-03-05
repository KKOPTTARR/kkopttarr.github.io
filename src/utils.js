export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
}

export function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

export function showFlash(flashRef, msg, ms = 1800) {
  flashRef.value = msg
  setTimeout(() => { flashRef.value = '' }, ms)
}

const SKILL_COLORS = {
  dmg:    '#ff6060',
  burn:   '#ff9040',
  heal:   '#6dcc6d',
  shield: '#60a8ff',
  poison: '#b070e8',
  val:    '#e8c840',
}

export function parseSkill(text = '') {
  return text.replace(/\{(\w+):([^}]*)\}/g, (_, type, content) => {
    const color = SKILL_COLORS[type]
    return color ? `<span style="color:${color};font-weight:600">${content}</span>` : content
  })
}
