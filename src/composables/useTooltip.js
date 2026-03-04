const SKILL_COLORS = {
  dmg: '#ff6060', burn: '#ff9040', heal: '#6dcc6d',
  shield: '#60a8ff', poison: '#b070e8',
  val: '#e8c840', charge: '#60d8ff', adj: '#40c8a0',
}

function parseSkill(text) {
  return (text || '').replace(/\{(\w+):([^}]*)\}/g, (_, type, content) => {
    const color = SKILL_COLORS[type]
    return color ? `<span style="color:${color};font-weight:600">${content}</span>` : content
  })
}

function getTooltip() {
  let el = document.getElementById('item-tooltip')
  if (!el) {
    el = document.createElement('div')
    el.id = 'item-tooltip'
    el.className = 'tooltip hidden'
    el.innerHTML = `
      <div class="tt-name"></div>
      <div class="tt-tags"></div>
      <div class="tt-stats"></div>
      <div class="tt-skill"></div>
    `
    document.body.appendChild(el)
  }
  return el
}

export function showItemTooltip(item, x, y) {
  const tooltip = getTooltip()
  tooltip.querySelector('.tt-name').textContent = item.name_cn
  tooltip.querySelector('.tt-tags').textContent = item.tags?.join(' · ') || ''

  const stats = []
  if (item.damage)  stats.push(`⚔️ ${item.damage}`)
  if (item.heal)    stats.push(`💚 ${item.heal}`)
  if (item.shield)  stats.push(`🛡 ${item.shield}`)
  if (item.burn)    stats.push(`🔥 ${item.burn}`)
  if (item.poison)  stats.push(`☠ ${item.poison}`)
  stats.push(`⏱ ${((item._cooldown ?? item.cooldown) / 1000).toFixed(1)}s`)
  tooltip.querySelector('.tt-stats').textContent = stats.join('  ')
  tooltip.querySelector('.tt-skill').innerHTML = parseSkill(item.skill_cn || '')

  tooltip.classList.remove('hidden')
  const m = 10, W = window.innerWidth, H = window.innerHeight
  let lx = x + m, ly = y - tooltip.offsetHeight - m
  if (lx + tooltip.offsetWidth > W - m) lx = x - tooltip.offsetWidth - m
  if (ly < m) ly = y + m
  tooltip.style.left = lx + 'px'
  tooltip.style.top  = ly + 'px'
}

export function hideItemTooltip() {
  document.getElementById('item-tooltip')?.classList.add('hidden')
}
