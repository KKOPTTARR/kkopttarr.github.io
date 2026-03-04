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

let _globalCritBonus      = 0     // 鱼饵累积的全局暴击率（0~1）
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
let _hookEffects = null   // 当前触发周期内钩子副效果收集器

function _t() { return Date.now() - _logT0 }

/** 真实时钟 HH:mm:ss.SSS */
function _wall() {
  const d = new Date()
  return d.toTimeString().slice(0, 8) + '.' + String(d.getMilliseconds()).padStart(3, '0')
}

/** HP/护盾快照 */
function _st() {
  return {
    pHp: _playerStat.hp, pMax: _playerStat.maxHp, pShd: _playerStat.shield,
    eHp: _enemyStat.hp,  eMax: _enemyStat.maxHp,  eShd: _enemyStat.shield,
  }
}

/** 场上所有物品当前触发状态快照（含 triggerCount） */
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
      const fx  = entry.effects.map(f => `${f.type}=${f.value}`).join(' ') || '—'
      const hfx = entry.hookEffects?.length
        ? ` +(${entry.hookEffects.map(h => `${h.src}:${h.val}`).join('/')})`
        : ''
      const sp  = entry.special ? ` [${entry.special}]` : ''
      const st  = `eStacks:burn=${entry.eStacks?.burn ?? 0} poi=${entry.eStacks?.poison ?? 0}`
      console.log(`${head} ⚔️  ${entry.name.padEnd(10)} #${entry.triggerCount} ${fx}${hfx}${sp} | ${s} | ${st}`)
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

/** 获取完整日志数组（只读副本） */
export function getBattleLog() { return [..._log] }
/** 清空日志 */
export function clearBattleLog() { _log = [] }

/** 将当前日志发送至 Vite dev 服务端，写入 logs/last-battle.json（仅 dev 环境有效） */
function _saveLogToDisk() {
  if (!import.meta.env.DEV) return
  fetch('/dev/save-log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(_log),
  }).catch(() => { /* dev server 未启动时静默忽略 */ })
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
    item.cooldownProgress  = 0
    item.burnStacks        = 0
    item.poisonStacks      = 0
    item.triggering        = false
    item.triggerCount      = 0
    item._cooldown         = item.cooldown   // 战斗内运行时副本
    item._waterHealPending = 0               // 海草水系额外治疗（每次只用一次）
    item._shieldGrowth     = 0               // 珊瑚护甲战斗内护盾累积
    item._pendingSelfCharge = 0              // 触发后自充能（军火商人技能）
  }
  _globalCritBonus = 0

  // tag_cooldown_reduce 技能：条件满足时永久降低对应 tag 物品的冷却时间
  if (_identitySkill?.type === 'tag_cooldown_reduce') {
    const { tag, threshold, ms } = _identitySkill
    const tagged = playerItems.filter(i => i.tags?.includes(tag))
    if (tagged.length >= threshold) {
      for (const item of tagged) item._cooldown = Math.max(COOLDOWN_FLOOR, item._cooldown - ms)
    }
  }

  // burn_poison_double 技能：条件满足时激活 DoT 翻倍
  _burnPoisonDoubleActive = _identitySkill?.type === 'burn_poison_double'
    && playerItems.filter(i => i.tags?.includes(_identitySkill.tag)).length >= (_identitySkill.threshold ?? 3)
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
const COOLDOWN_FLOOR = 500

function updateItem(item, dt) {
  if (item.triggering) return
  const cap = Math.max(item._cooldown, COOLDOWN_FLOOR)
  item.cooldownProgress = Math.min(item.cooldownProgress + dt, cap)
  if (item.cooldownProgress < cap) return
  item.triggering = true
  setTimeout(() => triggerItem(item), 0)
  setTimeout(() => {
    item.cooldownProgress = item._pendingSelfCharge || 0
    item._pendingSelfCharge = 0
    item.triggering = false
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

  let dmg    = item.damage || 0
  let burn   = item.burn   || 0
  let poison = item.poison || 0
  let heal   = item.heal   || 0

  // 海草：水系触发带来的一次性额外治疗
  if (item._waterHealPending) { heal += item._waterHealPending; item._waterHealPending = 0 }

  // 左轮加速：每完成一弹仓（cylinderSize 发），触发时间永久缩短（战斗内）
  const cylinderComplete = item.cylinderAccel && item.cylinderSize && item.triggerCount > 0
    && item.triggerCount % item.cylinderSize === 0
  let cylinderBoosted = false
  if (cylinderComplete) {
    const prevCd = item._cooldown
    item._cooldown = Math.max(COOLDOWN_FLOOR, item._cooldown - item.cylinderAccel)
    cylinderBoosted = item._cooldown < prevCd
  }

  // 叠火（燃烧响炮）
  const burnBoosted = item.burnBoostIfBurning && _enemyStat.burnStacks > 0
  if (burnBoosted) burn = Math.ceil(burn * (1 + item.burnBoostIfBurning))

  // 嗜血（食人鱼）
  const bloodthirstActive = item.bloodthirst && _enemyStat.hp / _enemyStat.maxHp < 0.5
  if (bloodthirstActive) dmg *= 2

  // 低血反扑（水母）
  const lowHpPoison = item.lowHpPoisonBoost && (_playerStat.hp / _playerStat.maxHp) < item.lowHpPoisonBoost
  if (lowHpPoison) poison *= 2

  // 鱼饵：全局暴击率（累积，任意物品均有机会触发）
  const isGlobalCrit = _globalCritBonus > 0 && Math.random() < _globalCritBonus
  if (isGlobalCrit) dmg = Math.round(dmg * 2)

  // 记录 resolveEffects 前的敌方 DoT 叠层（供余烬反噬等机制验算）
  const eStacksBefore = { burn: _enemyStat.burnStacks, poison: _enemyStat.poisonStacks }

  // 记录治疗前的空余血量，供珊瑚溢出转盾使用
  const healSpace = Math.max(0, _playerStat.maxHp - _playerStat.hp)

  // 珊瑚护甲：战斗内累积护盾量
  const effectiveShield = (item.shield || 0) + Math.floor(item._shieldGrowth || 0)
  const source = { damage: dmg, burn, poison, heal, shield: effectiveShield }
  const effects = resolveEffects(source, _enemyStat, 'enemy', _playerStat, 'player')

  const specialLabels = []
  if (isGlobalCrit)      specialLabels.push('暴击!')
  if (cylinderBoosted)   specialLabels.push('提速!')
  if (bloodthirstActive) specialLabels.push('嗜血!')
  if (burnBoosted)       specialLabels.push('叠火!')
  if (lowHpPoison)       specialLabels.push('反扑!')

  // 重置钩子副效果收集器
  _hookEffects = []
  const hookLabel = [
    onShieldGrowthTick(item),
    onGlobalCritBonusTick(item),
    onStrikeShieldTick(item),
    onAdjacentChargeTick(item),
    onGlobalChargeTick(item),
    onCompanionChargeTick(item),
    onRandomWeaponTriggerTick(item),
    onTagChargeTick(item),
    onBurnScaleDamageTick(item),
    onPoisonToShieldTick(item, poison),
    onChargeReadiestTick(item),
    onOverhealToShieldTick(item, heal, healSpace),
    onChargeWaterItemsTick(item),
  ].filter(Boolean).join(' ')
  if (hookLabel) specialLabels.push(hookLabel)

  const specialLabel = specialLabels.length ? specialLabels.join(' ') : null
  const hookEffects  = _hookEffects.length ? [..._hookEffects] : undefined
  _hookEffects = null

  accumStats(item, effects)
  if (effects.length > 0) onAttack?.({ name: item.name_cn, instanceId: item.instanceId, isEnemy: false, effects, specialLabel })
  _push({ t: _t(), wall: _wall(), type: 'item',
    name: item.name_cn, triggerCount: item.triggerCount,
    effects, hookEffects, special: specialLabel,
    eStacks: eStacksBefore, items: _snap(), ..._st() })

  // gun_charge 技能：枪械触发后，下次冷却从 1000ms 开始
  if (_identitySkill?.type === 'gun_charge' && item.tags?.includes('枪械')) {
    item._pendingSelfCharge = _identitySkill.ms ?? 1000
  }

  if (item.tags?.includes('水系')) notifyWaterTrigger(item)
  if (item.tags?.includes('武器')) notifyWeaponTrigger(item)
}

// ── 触发：敌方技能 ─────────────────────────────────────────
function triggerAbility(ab) {
  const effects = resolveEffects(ab, _playerStat, 'player', _enemyStat, 'enemy')
  if (effects.length > 0) onAttack?.({ name: ab.name, abilityId: ab.id, isEnemy: true, effects, hasBonus: false })
  _push({ t: _t(), wall: _wall(), type: 'enemy', name: ab.name, effects, items: _snap(), ..._st() })
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

// 珊瑚护甲：每次触发护盾量战斗内累积
function onShieldGrowthTick(item) {
  if (!item.shieldGrowth) return null
  item._shieldGrowth = (item._shieldGrowth || 0) + item.shieldGrowth
  return '硬化!'
}

// 鱼饵：每次触发全局暴击率累积
function onGlobalCritBonusTick(item) {
  if (!item.globalCritBonus) return null
  _globalCritBonus = Math.min(1, _globalCritBonus + item.globalCritBonus)
  return `暴击+${Math.round(item.globalCritBonus * 100)}%`
}

// 龟壳：触发时破除敌方护盾
function onStrikeShieldTick(item) {
  if (!item.strikeShield || _enemyStat.shield <= 0) return null
  const removed = Math.min(_enemyStat.shield, item.strikeShield)
  _enemyStat.shield = Math.max(0, _enemyStat.shield - item.strikeShield)
  _hookEffects?.push({ src: '破甲', val: -removed })
  return `破甲-${removed}`
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

// 鹦鹉：伙伴充能
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

// 弯刀：随机触发一件其他武器
function onRandomWeaponTriggerTick(item) {
  if (!item.randomWeaponTrigger) return null
  const weapons = _playerItems.filter(other => other !== item && other.tags?.includes('武器'))
  if (weapons.length === 0) return null
  const target = weapons[Math.floor(Math.random() * weapons.length)]
  const effects = resolveEffects(target, _enemyStat, 'enemy', _playerStat, 'player')
  accumStats(target, effects)
  if (effects.length > 0) onAttack?.({ name: target.name_cn, instanceId: target.instanceId, isEnemy: false, effects })
  onTagChargeTick(target)   // 链式触发同样触发同 tag 充能
  return '连击!'
}

// 联动充能：触发时为场上同 tag 其他物品充能
function onTagChargeTick(triggerItem) {
  if (!triggerItem.tagCharge) return null
  const { tag, ms } = triggerItem.tagCharge
  const targets = _playerItems.filter(o => o !== triggerItem && o.tags?.includes(tag))
  if (targets.length === 0) return null
  for (const other of targets) {
    const cap = Math.max(other._cooldown, COOLDOWN_FLOOR)
    other.cooldownProgress = Math.min(other.cooldownProgress + ms, cap)
  }
  return '共鸣!'
}

// 打火机：余烬反噬——基于敌方当前灼烧层数造成额外伤害
function onBurnScaleDamageTick(item) {
  if (!item.burnScaleDamage || _enemyStat.burnStacks <= 0) return null
  const bonus = Math.floor(_enemyStat.burnStacks * item.burnScaleDamage)
  if (bonus <= 0) return null
  const effects = [applyDamage(_enemyStat, 'enemy', bonus)].filter(Boolean)
  accumStats(item, effects)
  if (effects.length > 0) onAttack?.({ name: item.name_cn, instanceId: item.instanceId, isEnemy: false, effects })
  _hookEffects?.push({ src: '余焰', val: bonus })
  return `余焰+${bonus}`
}

// 河豚：以毒为盾——施放的剧毒量同时转为护盾
function onPoisonToShieldTick(item, poison) {
  if (!item.poisonToShield || poison <= 0) return null
  applyShield(_playerStat, 'player', poison)
  _hookEffects?.push({ src: '毒盾', val: poison })
  return `毒盾+${poison}`
}

// 幽渊鮟鱇：深渊诱饵——为进度最高的其他物品充能
function onChargeReadiestTick(item) {
  if (!item.chargeReadiest) return null
  let best = null, bestRatio = -1
  for (const other of _playerItems) {
    if (other === item) continue
    const cap = Math.max(other._cooldown, COOLDOWN_FLOOR)
    const ratio = other.cooldownProgress / cap
    if (ratio > bestRatio) { bestRatio = ratio; best = other }
  }
  if (!best) return null
  const cap = Math.max(best._cooldown, COOLDOWN_FLOOR)
  best.cooldownProgress = Math.min(best.cooldownProgress + item.chargeReadiest, cap)
  return '诱饵!'
}

// 珊瑚：涌泉成盾——超量治疗转为护盾
function onOverhealToShieldTick(item, heal, healSpace) {
  if (!item.overhealToShield || (heal || 0) <= 0) return null
  const excess = Math.max(0, (heal || 0) - healSpace)
  if (excess <= 0) return null
  applyShield(_playerStat, 'player', excess)
  _hookEffects?.push({ src: '溢盾', val: excess })
  return `溢盾+${excess}`
}

// 潜水头盔：深海赋能——触发时为所有水系物品充能
function onChargeWaterItemsTick(item) {
  if (!item.chargeWaterItems) return null
  const targets = _playerItems.filter(o => o !== item && o.tags?.includes('水系'))
  if (targets.length === 0) return null
  for (const other of targets) {
    const cap = Math.max(other._cooldown, COOLDOWN_FLOOR)
    other.cooldownProgress = Math.min(other.cooldownProgress + item.chargeWaterItems, cap)
  }
  return '深海!'
}

// 连发步枪：相邻武器触发时为自身充能
function notifyWeaponTrigger(sourceItem) {
  const idx = _playerItems.indexOf(sourceItem)
  const neighbors = [_playerItems[idx - 1], _playerItems[idx + 1]].filter(Boolean)
  for (const neighbor of neighbors) {
    if (!neighbor.chargeFromAdjacentWeapon) continue
    const cap = Math.max(neighbor._cooldown, COOLDOWN_FLOOR)
    neighbor.cooldownProgress = Math.min(neighbor.cooldownProgress + neighbor.chargeFromAdjacentWeapon, cap)
  }
}

// 水系联动：通知其他物品（waterBoostHeal 改为一次性 pending，避免累加）
function notifyWaterTrigger(sourceItem) {
  for (const item of _playerItems) {
    if (item === sourceItem) continue
    if (item.waterCharge) {
      const cap = Math.max(item._cooldown, COOLDOWN_FLOOR)
      item.cooldownProgress = Math.min(item.cooldownProgress + item.waterCharge, cap)
    }
    if (item.waterBoostHeal) {
      item._waterHealPending = item.waterBoostHeal   // 覆盖写入，不累加
    }
  }
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

  // 任何有叠层的 tick 都记录，玩家与敌方均记
  if (burnBefore > 0 || poisonBefore > 0) {
    _push({ t: _t(), wall: _wall(), type: 'dot', who,
      burnBefore, burnDmg, burnAbsorbed, burnLeft: stat.burnStacks,
      poisonBefore, poisonDmg, poisonLeft: stat.poisonStacks,
      ..._st() })
  }
}
