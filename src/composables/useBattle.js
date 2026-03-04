/**
 * useBattle — 自动战斗引擎
 *
 * 玩家：物品系统（cooldown + triggerItem）
 * 敌人：技能系统（cooldown + triggerAbility），无卡牌
 */

// ── 模块级状态 ────────────────────────────────────────────
let raf = null
let lastTime = 0
let burnPoisonAccum = 0
let _speed = 1

let onHpChange  = null
let onBattleEnd = null
let onAttack    = null

let _identitySkill        = null
let _burnPoisonDoubleActive = false

let _playerItems    = null
let _enemyAbilities = null
let _playerStat     = null
let _enemyStat      = null

const _myStats = new Map()

// ── 战斗日志 ──────────────────────────────────────────────
let _log = []
let _logT0 = 0

function _t() { return Date.now() - _logT0 }

function _wall() {
  const d = new Date()
  return d.toTimeString().slice(0, 8) + '.' + String(d.getMilliseconds()).padStart(3, '0')
}

function _st() {
  return {
    pHp: _playerStat.hp, pMax: _playerStat.maxHp, pShd: _playerStat.shield,
    eHp: _enemyStat.hp,  eMax: _enemyStat.maxHp,  eShd: _enemyStat.shield,
  }
}

function _snap() {
  if (!_playerItems) return []
  return _playerItems.map(item => {
    const cap = Math.max(item._cooldown || item.cooldown || 1000, COOLDOWN_FLOOR)
    const pct = Math.round(item.cooldownProgress / cap * 100)
    return {
      name: item.name_cn,
      pct,
      cd: +(item._cooldown / 1000).toFixed(1),
      n: item.triggerCount,
      ready: item.triggering || pct >= 100,
    }
  })
}

function _fmtSnap(snap) {
  return snap.map(s =>
    s.ready
      ? `${s.name}✓(#${s.n})`
      : `${s.name} ${s.pct}%(cd${s.cd}s #${s.n})`
  ).join('  ')
}

function _push(entry) {
  _log.push(entry)
  const t    = `${entry.t}`.padStart(5)
  const wall = entry.wall
  const head = `[${t}ms | ${wall}]`
  const s    = `P:${entry.pHp}/${entry.pMax}+${entry.pShd} E:${entry.eHp}/${entry.eMax}+${entry.eShd}`
  switch (entry.type) {
    case 'start': {
      const iList = Array.isArray(entry.items)
        ? entry.items.map(i => `${i.name}(${i.tier} cd${i.cd}s)`).join(', ')
        : entry.items
      console.log(`%c${head} 🎯 战斗开始  敌方HP=${entry.eHp}\n  阵容: ${iList}`,
        'color:#4CAF50;font-weight:bold')
      break
    }
    case 'item': {
      const fx = entry.effects.map(f => `${f.type}=${f.value}`).join(' ') || '—'
      const st = `eStacks:burn=${entry.eStacks?.burn ?? 0} poi=${entry.eStacks?.poison ?? 0}`
      console.log(`${head} ⚔️  ${entry.name.padEnd(10)} #${entry.triggerCount} ${fx} | ${s} | ${st}`)
      if (entry.items?.length) console.log(`  %c└ ${_fmtSnap(entry.items)}`, 'color:#888')
      break
    }
    case 'enemy': {
      const fx = entry.effects.map(f => `${f.type}=${f.value}`).join(' ') || '—'
      console.log(`%c${head} 👾 ${entry.name.padEnd(10)} ${fx} | ${s}`, 'color:#ef5350')
      if (entry.items?.length) console.log(`  %c└ ${_fmtSnap(entry.items)}`, 'color:#888')
      break
    }
    case 'dot': {
      const who   = entry.who === 'player' ? '己' : '敌'
      const parts = [
        entry.burnBefore   > 0 && `burn:${entry.burnBefore}→${entry.burnLeft}(HP-${entry.burnDmg} SHD-${entry.burnAbsorbed})`,
        entry.poisonBefore > 0 && `poison:${entry.poisonBefore}→${entry.poisonLeft}(HP-${entry.poisonDmg})`,
      ].filter(Boolean).join(' ')
      if (parts) console.log(`%c${head} 🔥 DoT[${who}] ${parts} | ${s}`, 'color:#FF9800')
      break
    }
    case 'end':
      console.log(`%c${head} ${entry.result === 'win' ? '🏆' : '💀'} 战斗结束 ${entry.result}`,
        'color:#9C27B0;font-weight:bold')
      break
  }
}

export function getBattleLog() { return [..._log] }
export function clearBattleLog() { _log = [] }

function _saveLogToDisk() {
  if (!import.meta.env.DEV) return
  fetch('/dev/save-log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(_log),
  }).catch(() => {})
}

// ── 速度控制 ──────────────────────────────────────────────
export function setBattleSpeed(s) { _speed = s }
export function getBattleSpeed()  { return _speed }

// ── 启动 / 停止 ───────────────────────────────────────────
export function startBattle(playerItems, enemyAbilities, playerStat, enemyStat, callbacks) {
  stopBattle()
  _speed          = 1
  _playerItems    = playerItems
  _enemyAbilities = enemyAbilities
  _playerStat     = playerStat
  _enemyStat      = enemyStat
  onHpChange      = callbacks.onHpChange
  onBattleEnd     = callbacks.onBattleEnd
  onAttack        = callbacks.onAttack ?? null
  _identitySkill  = callbacks.identitySkill ?? null

  for (const item of playerItems) {
    item.cooldownProgress = 0
    item.triggering       = false
    item.triggerCount     = 0
    item._cooldown        = item.cooldown
    item._bonusDamage     = 0
    item._bonusBurn       = 0
    item._bonusPoison     = 0
    item._bonusHeal       = 0
    item._bonusShield     = 0
  }
  playerStat.burnStacks  = 0
  playerStat.poisonStacks = 0
  enemyStat.burnStacks   = 0
  enemyStat.poisonStacks  = 0

  // tag_cooldown_reduce 身份技能
  if (_identitySkill?.type === 'tag_cooldown_reduce') {
    const { tags, threshold, ms } = _identitySkill
    const tagged = playerItems.filter(i => tags.some(t => i.tags?.includes(t)))
    if (tagged.length >= threshold) {
      for (const item of tagged) item._cooldown = Math.max(COOLDOWN_FLOOR, item._cooldown - ms)
    }
  }

  // burn_poison_double 身份技能
  _burnPoisonDoubleActive = _identitySkill?.type === 'burn_poison_double'
    && playerItems.filter(i => _identitySkill.tags.some(t => i.tags?.includes(t))).length >= (_identitySkill.threshold ?? 3)

  for (const ab of enemyAbilities) {
    ab.cooldownProgress = 0
    ab.triggering       = false
  }
  _myStats.clear()
  burnPoisonAccum = 0
  lastTime        = 0
  _log   = []
  _logT0 = Date.now()
  _push({ t: 0, wall: _wall(), type: 'start',
    items: playerItems.map(i => ({
      name:  i.name_cn,
      tier:  i.tier ?? 'Bronze',
      cd:    +(i.cooldown / 1000).toFixed(1),
      damage: i.damage || 0, burn: i.burn || 0, poison: i.poison || 0,
      heal:   i.heal   || 0, shield: i.shield || 0,
    })),
    ..._st() })
  raf = requestAnimationFrame(tick)
}

export function stopBattle() {
  if (raf) { cancelAnimationFrame(raf); raf = null }
  _identitySkill = null
  _burnPoisonDoubleActive = false
}

// ── 主循环 ────────────────────────────────────────────────
function tick(now) {
  const dt = (lastTime === 0 ? 16 : Math.min(now - lastTime, 100)) * _speed
  lastTime = now

  for (const item of _playerItems)    updateItem(item, dt)
  for (const ab   of _enemyAbilities) updateAbility(ab, dt)

  burnPoisonAccum += dt
  if (burnPoisonAccum >= 1000) {
    burnPoisonAccum -= 1000
    applyDoTTick()
  }

  if (_enemyStat.hp  <= 0) { _push({ t: _t(), wall: _wall(), type: 'end', result: 'win',  ..._st() }); _saveLogToDisk(); onBattleEnd?.('win',  Array.from(_myStats.values())); return }
  if (_playerStat.hp <= 0) { _push({ t: _t(), wall: _wall(), type: 'end', result: 'lose', ..._st() }); _saveLogToDisk(); onBattleEnd?.('lose', Array.from(_myStats.values())); return }

  raf = requestAnimationFrame(tick)
}

// ── 冷却推进 ──────────────────────────────────────────────
const COOLDOWN_FLOOR = 1000

function updateItem(item, dt) {
  if (item.triggering) return
  const cap = Math.max(item._cooldown, COOLDOWN_FLOOR)
  item.cooldownProgress = Math.min(item.cooldownProgress + dt, cap)
  if (item.cooldownProgress < cap) return
  item.triggering = true
  setTimeout(() => triggerItem(item), 0)
  setTimeout(() => {
    item.cooldownProgress = 0
    item.triggering       = false
  }, 300)
}

function updateAbility(ab, dt) {
  if (ab.triggering) return
  ab.cooldownProgress = Math.min(ab.cooldownProgress + dt, ab.cooldown)
  if (ab.cooldownProgress < ab.cooldown) return
  ab.triggering = true
  triggerAbility(ab)
  setTimeout(() => { ab.cooldownProgress = 0; ab.triggering = false }, 500)
}

// ── 效果原子函数 ───────────────────────────────────────────
function applyDamage(stat, who, amount) {
  if (amount <= 0) return null
  let dmg = amount
  if (stat.shield > 0) {
    const abs = Math.min(stat.shield, dmg)
    stat.shield -= abs
    dmg -= abs
  }
  if (dmg > 0) {
    stat.hp = Math.max(0, stat.hp - dmg)
    onHpChange?.(who, stat.hp, stat.shield, 'damage')
  }
  return { type: 'damage', value: amount }   // 保留 amount（意图值）便于战报展示
}

function applyHeal(stat, who, amount) {
  if (amount <= 0) return null
  const h = Math.min(amount, stat.maxHp - stat.hp)
  if (h <= 0) return null
  stat.hp += h
  onHpChange?.(who, stat.hp, stat.shield, 'heal')
  return { type: 'heal', value: h }
}

function applyShield(stat, who, amount) {
  if (amount <= 0) return null
  stat.shield += amount
  onHpChange?.(who, stat.hp, stat.shield, 'heal')
  return { type: 'shield', value: amount }
}

function applyBurn(stat, amount) {
  if (amount <= 0) return null
  stat.burnStacks = (stat.burnStacks || 0) + amount
  return { type: 'burn', value: amount }
}

function applyPoison(stat, amount) {
  if (amount <= 0) return null
  stat.poisonStacks = (stat.poisonStacks || 0) + amount
  return { type: 'poison', value: amount }
}

function resolveEffects(source, targetStat, targetWho, selfStat, selfWho) {
  return [
    applyDamage(targetStat, targetWho, source.damage),
    applyHeal  (selfStat,   selfWho,   source.heal),
    applyShield(selfStat,   selfWho,   source.shield),
    applyBurn  (targetStat,            source.burn),
    applyPoison(targetStat,            source.poison),
  ].filter(Boolean)
}

// ── 触发：玩家物品 ─────────────────────────────────────────
function triggerItem(item) {
  item.triggerCount++

  // 应用战斗内累积的 bonus
  const source = {
    damage: (item.damage || 0) + (item._bonusDamage || 0),
    heal:   (item.heal   || 0) + (item._bonusHeal   || 0),
    shield: (item.shield || 0) + (item._bonusShield || 0),
    burn:   (item.burn   || 0) + (item._bonusBurn   || 0),
    poison: (item.poison || 0) + (item._bonusPoison || 0),
  }

  const eStacksBefore = { burn: _enemyStat.burnStacks, poison: _enemyStat.poisonStacks }
  const times = item.onTrigger?.multiTrigger ?? 1
  const allEffects = []
  for (let i = 0; i < times; i++) {
    const effects = resolveEffects(source, _enemyStat, 'enemy', _playerStat, 'player')
    allEffects.push(...effects)
    if (effects.length > 0) onAttack?.({ name: item.name_cn, instanceId: item.instanceId, isEnemy: false, effects })
    applyOnTrigger(item)
  }

  accumStats(item, allEffects)
  _push({ t: _t(), wall: _wall(), type: 'item',
    name: item.name_cn, triggerCount: item.triggerCount,
    effects: allEffects, times, eStacks: eStacksBefore, items: _snap(), ..._st() })

}

// ── onTrigger 后处理 ───────────────────────────────────────
function applyOnTrigger(item) {
  const ot = item.onTrigger
  if (!ot) return

  // 相邻充能
  if (ot.adjacentCharge) {
    const idx = _playerItems.indexOf(item)
    const neighbors = [_playerItems[idx - 1], _playerItems[idx + 1]].filter(Boolean)
    for (const nb of neighbors) {
      const cap = Math.max(nb._cooldown, COOLDOWN_FLOOR)
      nb.cooldownProgress = Math.min(nb.cooldownProgress + ot.adjacentCharge, cap)
    }
  }

  // 战斗内累积：伤害/灼烧/剧毒
  if (ot.damageGrowth)  item._bonusDamage  = (item._bonusDamage  || 0) + ot.damageGrowth
  if (ot.healGrowth)    item._bonusHeal    = (item._bonusHeal    || 0) + ot.healGrowth
  if (ot.shieldGrowth)  item._bonusShield  = (item._bonusShield  || 0) + ot.shieldGrowth
  if (ot.burnGrowth)    item._bonusBurn    = (item._bonusBurn    || 0) + ot.burnGrowth
  if (ot.poisonGrowth)  item._bonusPoison  = (item._bonusPoison  || 0) + ot.poisonGrowth
}

// ── 触发：敌方技能 ─────────────────────────────────────────
function triggerAbility(ab) {
  const effects = resolveEffects(ab, _playerStat, 'player', _enemyStat, 'enemy')
  if (effects.length > 0) onAttack?.({ name: ab.name, abilityId: ab.id, isEnemy: true, effects, hasBonus: false })
  _push({ t: _t(), wall: _wall(), type: 'enemy', name: ab.name, effects, items: _snap(), ..._st() })
}

// ── 战报统计 ───────────────────────────────────────────────
function accumStats(item, effects) {
  if (item.isEnemy || effects.length === 0) return
  const s = _myStats.get(item.instanceId) ?? {
    instanceId: item.instanceId, name_cn: item.name_cn, name_en: item.name_en, tier: item.tier, id: item.id,
    damage: 0, heal: 0, shield: 0, burn: 0, poison: 0,
  }
  for (const fx of effects) s[fx.type] += fx.value
  _myStats.set(item.instanceId, s)
}

// ── DoT Tick（每秒执行一次）──────────────────────────────
function applyDoTTick() {
  applyStatDoT(_playerStat, 'player')
  applyStatDoT(_enemyStat,  'enemy')
}

function applyStatDoT(stat, who) {
  const dotMult = (_burnPoisonDoubleActive && who === 'enemy') ? 2 : 1
  let burnDmg = 0, burnAbsorbed = 0, poisonDmg = 0
  const burnBefore   = stat.burnStacks
  const poisonBefore = stat.poisonStacks

  if (stat.burnStacks > 0) {
    let burn = stat.burnStacks * dotMult
    if (stat.shield > 0) {
      const abs = Math.min(stat.shield, burn)
      stat.shield -= abs
      burn -= abs
      burnAbsorbed = abs
    }
    if (burn > 0) { stat.hp = Math.max(0, stat.hp - burn); burnDmg = burn }
    stat.burnStacks = Math.floor(stat.burnStacks * 0.6)
    onHpChange?.(who, stat.hp, stat.shield, 'damage')
  }
  if (stat.poisonStacks > 0) {
    poisonDmg = stat.poisonStacks * dotMult
    stat.hp = Math.max(0, stat.hp - poisonDmg)
    stat.poisonStacks = Math.floor(stat.poisonStacks * 0.6)
    onHpChange?.(who, stat.hp, stat.shield, 'damage')
  }

  if (burnBefore > 0 || poisonBefore > 0) {
    _push({ t: _t(), wall: _wall(), type: 'dot', who,
      burnBefore, burnDmg, burnAbsorbed, burnLeft: stat.burnStacks,
      poisonBefore, poisonDmg, poisonLeft: stat.poisonStacks,
      ..._st() })
  }
}
