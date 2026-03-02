/**
 * useBattle — 自动战斗引擎
 *
 * 玩家：物品系统（cooldown + triggerItem）
 * 敌人：技能系统（cooldown + triggerAbility），无卡牌
 */

let raf = null
let lastTime = 0
let burnPoisonAccum = 0
let _speed = 1

export function setBattleSpeed(s) { _speed = s }
export function getBattleSpeed()  { return _speed }

let onHpChange  = null
let onBattleEnd = null
let onAttack    = null
const _myStats  = new Map()

let _playerItems    = null
let _enemyAbilities = null   // reactive ability 实例数组
let _playerStat     = null
let _enemyStat      = null

export function startBattle(playerItems, enemyAbilities, playerStat, enemyStat, callbacks) {
  stopBattle()
  _speed = 1
  _playerItems    = playerItems
  _enemyAbilities = enemyAbilities
  _playerStat     = playerStat
  _enemyStat      = enemyStat
  onHpChange      = callbacks.onHpChange
  onBattleEnd     = callbacks.onBattleEnd
  onAttack        = callbacks.onAttack ?? null

  // 重置玩家物品状态
  for (const item of playerItems) {
    item.cooldownProgress = 0
    item.burnStacks   = 0
    item.poisonStacks = 0
    item.triggering   = false
  }
  // 重置敌方技能状态
  for (const ab of enemyAbilities) {
    ab.cooldownProgress = 0
    ab.triggering       = false
  }
  _myStats.clear()

  burnPoisonAccum = 0
  lastTime = 0
  raf = requestAnimationFrame(tick)
}

export function stopBattle() {
  if (raf) { cancelAnimationFrame(raf); raf = null }
}

// ── 主循环 ────────────────────────────────────────────────
function tick(now) {
  const dt = (lastTime === 0 ? 16 : Math.min(now - lastTime, 100)) * _speed
  lastTime = now

  for (const item of _playerItems) updateItem(item, dt)
  for (const ab   of _enemyAbilities) updateAbility(ab, dt)

  // DoT tick（每 1000ms）
  burnPoisonAccum += dt
  if (burnPoisonAccum >= 1000) {
    burnPoisonAccum -= 1000
    applyDoTTick()
  }

  if (_enemyStat.hp <= 0) { onBattleEnd?.('win',  Array.from(_myStats.values())); return }
  if (_playerStat.hp <= 0) { onBattleEnd?.('lose', Array.from(_myStats.values())); return }

  raf = requestAnimationFrame(tick)
}

// ── 玩家物品更新 ──────────────────────────────────────────
function updateItem(item, dt) {
  if (item.triggering) return
  item.cooldownProgress = Math.min(item.cooldownProgress + dt, item.cooldown)
  if (item.cooldownProgress >= item.cooldown) {
    item.triggering = true
    setTimeout(() => triggerItem(item), 0)
    setTimeout(() => {
      item.cooldownProgress = 0
      item.triggering = false
    }, 300)
  }
}

// ── 敌方技能更新 ──────────────────────────────────────────
function updateAbility(ab, dt) {
  if (ab.triggering) return
  ab.cooldownProgress = Math.min(ab.cooldownProgress + dt, ab.cooldown)
  if (ab.cooldownProgress >= ab.cooldown) {
    ab.triggering = true
    triggerAbility(ab)
    setTimeout(() => {
      ab.cooldownProgress = 0
      ab.triggering = false
    }, 500)
  }
}

// ── 玩家物品触发 ──────────────────────────────────────────
function triggerItem(item) {
  const effects = []

  if (item.damage > 0) {
    let dmg = item.damage
    if (_enemyStat.shield > 0) {
      const abs = Math.min(_enemyStat.shield, dmg)
      _enemyStat.shield -= abs; dmg -= abs
    }
    if (dmg > 0) {
      _enemyStat.hp = Math.max(0, _enemyStat.hp - dmg)
      onHpChange?.('enemy', _enemyStat.hp, _enemyStat.shield, 'damage')
    }
    effects.push({ type: 'damage', value: item.damage })
  }
  if (item.heal > 0) {
    const h = Math.min(item.heal, _playerStat.maxHp - _playerStat.hp)
    if (h > 0) { _playerStat.hp += h; onHpChange?.('player', _playerStat.hp, _playerStat.shield, 'heal') }
    effects.push({ type: 'heal', value: item.heal })
  }
  if (item.shield > 0) {
    _playerStat.shield += item.shield
    onHpChange?.('player', _playerStat.hp, _playerStat.shield, 'heal')
    effects.push({ type: 'shield', value: item.shield })
  }
  if (item.burn > 0) {
    _enemyStat.burnStacks = (_enemyStat.burnStacks || 0) + item.burn
    effects.push({ type: 'burn', value: item.burn })
  }
  if (item.poison > 0) {
    _enemyStat.poisonStacks = (_enemyStat.poisonStacks || 0) + item.poison
    effects.push({ type: 'poison', value: item.poison })
  }

  if (!item.isEnemy && effects.length > 0) {
    const s = _myStats.get(item.instanceId) || {
      instanceId: item.instanceId, name_cn: item.name_cn, name_en: item.name_en, tier: item.tier, id: item.id,
      damage: 0, heal: 0, shield: 0, burn: 0, poison: 0,
    }
    for (const fx of effects) {
      if (fx.type === 'damage') s.damage += fx.value
      if (fx.type === 'heal')   s.heal   += fx.value
      if (fx.type === 'shield') s.shield += fx.value
      if (fx.type === 'burn')   s.burn   += fx.value
      if (fx.type === 'poison') s.poison += fx.value
    }
    _myStats.set(item.instanceId, s)
  }

  if (effects.length > 0) {
    onAttack?.({ name: item.name_cn, instanceId: item.instanceId, isEnemy: false, effects })
  }
}

// ── 敌方技能触发 ──────────────────────────────────────────
function triggerAbility(ab) {
  const effects = []

  if (ab.damage > 0) {
    let dmg = ab.damage
    if (_playerStat.shield > 0) {
      const abs = Math.min(_playerStat.shield, dmg)
      _playerStat.shield -= abs; dmg -= abs
    }
    if (dmg > 0) {
      _playerStat.hp = Math.max(0, _playerStat.hp - dmg)
      onHpChange?.('player', _playerStat.hp, _playerStat.shield, 'damage')
    }
    effects.push({ type: 'damage', value: ab.damage })
  }
  if (ab.heal > 0) {
    const h = Math.min(ab.heal, _enemyStat.maxHp - _enemyStat.hp)
    if (h > 0) { _enemyStat.hp += h; onHpChange?.('enemy', _enemyStat.hp, _enemyStat.shield, 'heal') }
    effects.push({ type: 'heal', value: ab.heal })
  }
  if (ab.shield > 0) {
    _enemyStat.shield += ab.shield
    onHpChange?.('enemy', _enemyStat.hp, _enemyStat.shield, 'heal')
    effects.push({ type: 'shield', value: ab.shield })
  }
  if (ab.burn > 0) {
    // 灼烧直接存在 playerStat 上
    _playerStat.burnStacks = (_playerStat.burnStacks || 0) + ab.burn
    effects.push({ type: 'burn', value: ab.burn })
  }
  if (ab.poison > 0) {
    _playerStat.poisonStacks = (_playerStat.poisonStacks || 0) + ab.poison
    effects.push({ type: 'poison', value: ab.poison })
  }

  if (effects.length > 0) {
    onAttack?.({ name: ab.name, abilityId: ab.id, isEnemy: true, effects, hasBonus: false })
  }
}

// ── DoT Tick（每秒执行一次）──────────────────────────────
function applyDoTTick() {
  // 玩家受到的 DoT（敌方技能施加的 burn/poison 在 playerStat 上）
  applyStatDoT(_playerStat, 'player')
  // 敌方受到的 DoT（玩家物品施加的 burn/poison 在 enemyStat 上）
  applyStatDoT(_enemyStat, 'enemy')
}

function applyStatDoT(stat, who) {
  if (stat.burnStacks > 0) {
    let burn = stat.burnStacks
    if (stat.shield > 0) { const abs = Math.min(stat.shield, burn); stat.shield -= abs; burn -= abs }
    if (burn > 0) stat.hp = Math.max(0, stat.hp - burn)
    stat.burnStacks = Math.floor(stat.burnStacks * 0.5)
    onHpChange?.(who, stat.hp, stat.shield, 'damage')
  }
  if (stat.poisonStacks > 0) {
    stat.hp = Math.max(0, stat.hp - stat.poisonStacks)
    stat.poisonStacks = Math.floor(stat.poisonStacks * 0.5)
    onHpChange?.(who, stat.hp, stat.shield, 'damage')
  }
}

