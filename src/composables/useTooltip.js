export function showItemTooltip(item, x, y) {
  const tooltip = document.getElementById('item-tooltip')
  if (!tooltip) return
  tooltip.querySelector('.tt-name').textContent  = item.name_cn
  tooltip.querySelector('.tt-tags').textContent  = item.tags?.join(' · ') || ''
  const stats = []
  if (item.damage)  stats.push(`⚔️ ${item.damage}`)
  if (item.heal)    stats.push(`💚 ${item.heal}`)
  if (item.shield)  stats.push(`🛡 ${item.shield}`)
  if (item.burn)    stats.push(`🔥 ${item.burn}`)
  if (item.poison)  stats.push(`☠ ${item.poison}`)
  stats.push(`⏱ ${((item._cooldown ?? item.cooldown) / 1000).toFixed(1)}s`)
  tooltip.querySelector('.tt-stats').textContent = stats.join('  ')
  tooltip.querySelector('.tt-skill').textContent = item.skill_cn || ''
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
