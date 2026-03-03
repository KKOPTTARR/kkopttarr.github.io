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

let _playerItems    = null
let _enemyAbilities = null
let _playerStat     = null
let _enemyStat      = null

const _myStats = new Map()

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

  for (const item of playerItems) {
    item.cooldownProgress = 0
    item.burnStacks       = 0
    item.poisonStacks     = 0
    item.triggering       = false
    item.triggerCount     = 0
    item._cooldown        = item.cooldown   // 战斗内运行时副本，不污染原始值
  }
  for (const ab of enemyAbilities) {
    ab.cooldownProgress = 0
    ab.triggering       = false
  }
  _myStats.clear()
  burnPoisonAccum = 0
  lastTime        = 0
  raf = requestAnimationFrame(tick)
}

export function stopBattle() {
  if (raf) { cancelAnimationFrame(raf); raf = null }
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

  if (_enemyStat.hp  <= 0) { onBattleEnd?.('win',  Array.from(_myStats.values())); return }
  if (_playerStat.hp <= 0) { onBattleEnd?.('lose', Array.from(_myStats.values())); return }

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
  setTimeout(() => { item.cooldownProgress = 0; item.triggering = false }, 300)
}

function updateAbility(ab, dt) {
  if (ab.triggering) return
  ab.cooldownProgress = Math.min(ab.cooldownProgress + dt, ab.cooldown)
  if (ab.cooldownProgress < ab.cooldown) return
  ab.triggering = true
  triggerAbility(ab)
  setTimeout(() => { ab.cooldownProgress = 0; ab.triggering = false }, 500)
}

// ── 效果原子函数（返回 effect 对象，无效时返回 null）────────
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
  return { type: 'damage', value: amount }
}

function applyHeal(stat, who, amount) {
  if (amount <= 0) return null
  const h = Math.min(amount, stat.maxHp - stat.hp)
  if (h > 0) { stat.hp += h; onHpChange?.(who, stat.hp, stat.shield, 'heal') }
  return { type: 'heal', value: amount }
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

// ── 统一效果结算（玩家/敌方通用）────────────────────────────
// targetStat/who：受击方；selfStat/selfWho：出手方
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

  // 暴击检查（左轮手枪）
  const isCrit = item.cylinderCrit && item.triggerCount % item.cylinderSize === 0
  const origDamage = item.damage
  if (isCrit) item.damage = Math.round(item.damage * item.cylinderCrit)

  // 叠火（燃烧响炮）
  const origBurn = item.burn
  const burnBoosted = item.burnBoostIfBurning && _enemyStat.burnStacks > 0
  if (burnBoosted) item.burn = Math.ceil(item.burn * (1 + item.burnBoostIfBurning))

  // 嗜血（食人鱼）
  const bloodthirstActive = item.bloodthirst && _enemyStat.hp / _enemyStat.maxHp < 0.5
  if (bloodthirstActive) item.damage = item.damage * 2

  const effects = resolveEffects(item, _enemyStat, 'enemy', _playerStat, 'player')
  if (isCrit) item.damage = origDamage
  item.burn = origBurn

  const specialLabels = []
  if (isCrit)            specialLabels.push('暴击!')
  if (bloodthirstActive) specialLabels.push('嗜血!')
  if (burnBoosted)       specialLabels.push('叠火!')
  const specialLabel = specialLabels.length ? specialLabels.join(' ') : null

  accumStats(item, effects)
  if (effects.length > 0) onAttack?.({ name: item.name_cn, instanceId: item.instanceId, isEnemy: false, effects, isCrit, specialLabel })

  const hookLabel = [
    onMomentumTick(item),
    onShieldGrowthTick(item),
    onAdjacentChargeTick(item),
    onGlobalChargeTick(item),
    onDamageToShieldTick(item),
    onCompanionChargeTick(item),
    onRandomWeaponTriggerTick(item),
  ].filter(Boolean).join(' ')
  if (hookLabel) specialLabels.push(hookLabel)

  if (item.tags?.includes('水系')) notifyWaterTrigger(item)
}

// ── 触发：敌方技能 ─────────────────────────────────────────
function triggerAbility(ab) {
  const effects = resolveEffects(ab, _playerStat, 'player', _enemyStat, 'enemy')
  if (effects.length > 0) onAttack?.({ name: ab.name, abilityId: ab.id, isEnemy: true, effects, hasBonus: false })
}

// ── 后触发钩子 ────────────────────────────────────────────
// 战报统计累加
function accumStats(item, effects) {
  if (item.isEnemy || effects.length === 0) return
  const s = _myStats.get(item.instanceId) ?? {
    instanceId: item.instanceId, name_cn: item.name_cn, name_en: item.name_en, tier: item.tier, id: item.id,
    damage: 0, heal: 0, shield: 0, burn: 0, poison: 0,
  }
  for (const fx of effects) s[fx.type] += fx.value
  _myStats.set(item.instanceId, s)
}

// 连发步枪：动能加速
function onMomentumTick(item) {
  if (!item.momentumReduction) return null
  item._cooldown = Math.max(item._cooldown - item.momentumReduction, COOLDOWN_FLOOR)
  return '加速!'
}

// 龟壳：硬化
function onShieldGrowthTick(item) {
  if (!item.shieldGrowth) return null
  item.shield += item.shieldGrowth
  return '硬化!'
}

// 手雷：相邻充能
function onAdjacentChargeTick(item) {
  if (!item.adjacentCharge) return null
  const idx = _playerItems.indexOf(item)
  const neighbors = [_playerItems[idx - 1], _playerItems[idx + 1]].filter(Boolean)
  if (neighbors.length === 0) return null
  for (const neighbor of neighbors) {
    const cap = Math.max(neighbor._cooldown, COOLDOWN_FLOOR)
    neighbor.cooldownProgress = Math.min(neighbor.cooldownProgress + item.adjacentCharge, cap)
  }
  return '充能!'
}

// 风暴瓶：全场充能
function onGlobalChargeTick(item) {
  if (!item.globalCharge) return null
  for (const other of _playerItems) {
    if (other === item) continue
    const cap = Math.max(other._cooldown, COOLDOWN_FLOOR)
    other.cooldownProgress = Math.min(other.cooldownProgress + item.globalCharge, cap)
  }
  return '风暴!'
}

// 深潜器：伤害转护盾
function onDamageToShieldTick(item) {
  if (!item.damageToShield || item.damage <= 0) return null
  applyShield(_playerStat, 'player', item.damage)
  return '装甲!'
}

// 鹦鹉皮特：伙伴充能
function onCompanionChargeTick(item) {
  if (!item.companionCharge) return null
  const targets = _playerItems.filter(o => o !== item && o.tags?.includes('伙伴'))
  if (targets.length === 0) return null
  for (const other of targets) {
    const cap = Math.max(other._cooldown, COOLDOWN_FLOOR)
    other.cooldownProgress = Math.min(other.cooldownProgress + item.companionCharge, cap)
  }
  return '呼朋!'
}

// 弯刀：随机触发一件其他武器（仅效果，不重置冷却）
function onRandomWeaponTriggerTick(item) {
  if (!item.randomWeaponTrigger) return null
  const weapons = _playerItems.filter(other => other !== item && other.tags?.includes('武器'))
  if (weapons.length === 0) return null
  const target = weapons[Math.floor(Math.random() * weapons.length)]
  const effects = resolveEffects(target, _enemyStat, 'enemy', _playerStat, 'player')
  accumStats(target, effects)
  if (effects.length > 0) onAttack?.({ name: target.name_cn, instanceId: target.instanceId, isEnemy: false, effects })
  return '连击!'
}

// 水系联动：通知其他物品
function notifyWaterTrigger(sourceItem) {
  for (const item of _playerItems) {
    if (item === sourceItem) continue
    if (item.waterCharge) {
      const cap = Math.max(item._cooldown, COOLDOWN_FLOOR)
      item.cooldownProgress = Math.min(item.cooldownProgress + item.waterCharge, cap)
    }
    if (item.waterBoostHeal) {
      item.heal = (item.heal || 0) + item.waterBoostHeal
    }
  }
}

// ── DoT Tick（每秒执行一次）──────────────────────────────
function applyDoTTick() {
  applyStatDoT(_playerStat, 'player')
  applyStatDoT(_enemyStat,  'enemy')
}

function applyStatDoT(stat, who) {
  if (stat.burnStacks > 0) {
    let burn = stat.burnStacks
    if (stat.shield > 0) {
      const abs = Math.min(stat.shield, burn)
      stat.shield -= abs
      burn -= abs
    }
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
