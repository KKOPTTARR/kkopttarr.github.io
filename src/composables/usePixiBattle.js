/**
 * usePixiBattle — 战斗粒子特效系统
 *
 * - 浮字伤害数字（instanceId 版 + canvas 坐标版）
 * - 投射物 bezier 弧线飞行（玩家→敌方 / 敌方→玩家）
 * - 落点粒子爆炸
 * - 冲击波扩散环
 */

import { Application, Text, TextStyle, Graphics } from 'pixi.js'

// ── 颜色表 ─────────────────────────────────────────────────────
const FX_CSS = {
  damage: '#ff6050', heal: '#5ad070', shield: '#70c8f0',
  burn:   '#e07030', poison: '#70b020', dot:    '#e07030',
}
const FX_PIXI = {
  damage: { main: 0xff5030, subs: [0xff8060, 0xffaa80] },
  burn:   { main: 0xff8020, subs: [0xffdd00, 0xff5000] },
  poison: { main: 0x80cc20, subs: [0x50aa10, 0xaaee40] },
  heal:   { main: 0x40dd70, subs: [0x20aa50, 0x80ffaa] },
  shield: { main: 0x80d0ff, subs: [0x40a0dd, 0xb0e8ff] },
  dot:    { main: 0xe07030, subs: [0xff8040, 0xffaa60] },
}

let _app = null
let _pixiSpeed = 1
export function setPixiSpeed(s) { _pixiSpeed = s }

const _floats      = []
const _projectiles = []
const _particles   = []
const _rings       = []

// ── 初始化 / 销毁 ──────────────────────────────────────────────
export async function initPixi(canvasEl) {
  if (_app) { _app.destroy(false); _app = null }
  const tmp = new Application()
  await tmp.init({
    canvas: canvasEl, backgroundAlpha: 0, antialias: true,
    autoDensity: true, resolution: window.devicePixelRatio || 1,
    resizeTo: canvasEl.parentElement,
  })
  _app = tmp
  _app.ticker.add(_tick)
}

export function destroyPixi() {
  if (_app) { _app.destroy(false); _app = null }
  _floats.length = _projectiles.length = _particles.length = _rings.length = 0
}

// ── 空存根（兼容旧调用）──────────────────────────────────────
export function registerSprites() {}
export function syncPositions()   {}
export function setItems()        {}
export function drawSynergyLine() {}

// ── 攻击闪光（CSS class toggle）──────────────────────────────
export function triggerAttackFlash(instanceId) {
  const el = document.querySelector(`[data-instance="${instanceId}"]`)
  if (!el) return
  el.classList.remove('flash-attack')
  void el.offsetWidth
  el.classList.add('flash-attack')
  setTimeout(() => el.classList.remove('flash-attack'), 450)
}

// ── 浮字（instanceId 定位，保留兼容）────────────────────────
export function spawnFloatingText(instanceId, text, type) {
  if (!_app) return
  const el = document.querySelector(`[data-instance="${instanceId}"]`)
  if (!el) return
  const r  = el.getBoundingClientRect()
  const cr = _app.canvas.getBoundingClientRect()
  _addFloat(r.left + r.width / 2 - cr.left, r.top + r.height / 2 - cr.top, text, type)
}

// ── 浮字（canvas 坐标，落点专用）─────────────────────────────
export function spawnFloatingTextAt(x, y, text, type) {
  if (!_app) return
  _addFloat(x, y, text, type)
}

function _addFloat(x, y, text, type) {
  const style = new TextStyle({
    fontFamily: 'sans-serif', fontWeight: '900',
    fontSize: 22, fill: FX_CSS[type] ?? '#ffffff',
    stroke: { color: '#000', width: 3 },
    dropShadow: { color: '#000', blur: 4, distance: 2 },
  })
  const t = new Text({ text, style })
  t.anchor.set(0.5, 0.5)
  t.x = x; t.y = y
  _app.stage.addChild(t)
  _floats.push({ obj: t, vy: 2.2, life: 1.0 })
}

// ── 投射物 ────────────────────────────────────────────────────
/**
 * @param {string|null} instanceId  玩家卡牌 instanceId（isEnemy=false 时使用）
 * @param {boolean}     isEnemy     true = 敌方攻击，false = 玩家攻击
 * @param {string}      type        效果类型 damage/burn/poison/heal/shield
 * @param {function}    onImpact    落点回调 (toX, toY) => void
 */
export function spawnProjectile(instanceId, isEnemy, type, onImpact) {
  if (!_app) return
  const cr = _app.canvas.getBoundingClientRect()
  let fromX, fromY, toX, toY

  if (!isEnemy) {
    // 玩家卡牌 → 敌方插画
    const src = instanceId ? document.querySelector(`[data-instance="${instanceId}"]`) : null
    if (!src) return
    const sr = src.getBoundingClientRect()
    fromX = sr.left + sr.width  / 2 - cr.left
    fromY = sr.top  + sr.height / 2 - cr.top

    const dst = document.querySelector('.enemy-portrait-wrap') ?? document.querySelector('.enemy-section')
    if (!dst) return
    const dr = dst.getBoundingClientRect()
    toX = dr.left + dr.width  / 2 - cr.left
    toY = dr.top  + dr.height / 2 - cr.top
  } else {
    // 敌方插画 → 玩家格子（随机落点增加变化感）
    const src = document.querySelector('.enemy-portrait-wrap') ?? document.querySelector('.enemy-section')
    if (!src) return
    const sr = src.getBoundingClientRect()
    fromX = sr.left + sr.width  / 2 - cr.left
    fromY = sr.top  + sr.height / 2 - cr.top

    const dst = document.querySelector('.arena-grid')
    if (!dst) return
    const dr = dst.getBoundingClientRect()
    toX = dr.left + dr.width  * (0.25 + Math.random() * 0.5) - cr.left
    toY = dr.top  + dr.height * (0.2  + Math.random() * 0.6) - cr.top
  }

  // bezier 弧线控制点（轻微偏移增加弧度感）
  const cx = (fromX + toX) / 2 + (Math.random() - 0.5) * 40
  const cy = Math.min(fromY, toY) - 30

  const proj = _makeProjectile(type)
  proj.x = fromX; proj.y = fromY
  _app.stage.addChild(proj)
  _projectiles.push({ obj: proj, fromX, fromY, toX, toY, cx, cy, t: 0, duration: 0.18, type, onImpact })
}

function _makeProjectile(type) {
  const g   = new Graphics()
  const col = (FX_PIXI[type] ?? FX_PIXI.damage).main
  switch (type) {
    case 'damage':
      // 双层菱形，尖端朝飞行方向
      g.poly([0,-9, 5,0, 0,9, -5,0]).fill({ color: col })
      g.poly([0,-6, 3,0, 0,6, -3,0]).fill({ color: 0xffaa80 })
      break
    case 'burn':
      // 双圆火球
      g.circle(0, 0, 7).fill({ color: col })
      g.circle(0, 0, 4).fill({ color: 0xffee60 })
      break
    case 'poison':
      // 双圆毒球
      g.circle(0, 0, 6).fill({ color: col })
      g.circle(0, 0, 3).fill({ color: 0xccff50 })
      break
    case 'heal':
      // 十字光点
      g.rect(-2, -7, 4, 14).fill({ color: col })
      g.rect(-7, -2, 14, 4).fill({ color: col })
      break
    case 'shield':
      // 菱形护盾碎片
      g.poly([0,-8, 6,0, 0,8, -6,0]).fill({ color: col })
      break
    default:
      g.circle(0, 0, 5).fill({ color: 0xffffff })
  }
  return g
}

// ── 落点爆炸粒子 + 冲击波环 ──────────────────────────────────
function _burst(x, y, type) {
  if (!_app) return
  const fx    = FX_PIXI[type] ?? FX_PIXI.damage
  const count = type === 'damage' ? 12 : 8

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.6
    const spd   = 2.5 + Math.random() * 3.5
    const sz    = 1.5 + Math.random() * 2.5
    const col   = Math.random() > 0.4
      ? fx.main
      : fx.subs[Math.floor(Math.random() * fx.subs.length)]
    const g = new Graphics()
    g.circle(0, 0, sz).fill({ color: col })
    g.x = x; g.y = y
    _app.stage.addChild(g)
    const life = 0.5 + Math.random() * 0.3
    _particles.push({ obj: g, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd, life, maxLife: life })
  }

  // 冲击波环
  const ring = new Graphics()
  ring.x = x; ring.y = y
  _app.stage.addChild(ring)
  _rings.push({ obj: ring, color: fx.main, radius: 4, life: 1.0 })
}

// ── 主循环 ────────────────────────────────────────────────────
function _tick(ticker) {
  const dt = (ticker.deltaTime / 60) * _pixiSpeed

  // 浮字
  for (let i = _floats.length - 1; i >= 0; i--) {
    const f = _floats[i]
    f.obj.y -= f.vy
    f.vy    *= 0.93
    f.life  -= dt * 1.2
    f.obj.alpha = Math.max(0, f.life)
    if (f.life <= 0) { _app.stage.removeChild(f.obj); f.obj.destroy(); _floats.splice(i, 1) }
  }

  // 投射物（quadratic bezier）
  for (let i = _projectiles.length - 1; i >= 0; i--) {
    const p  = _projectiles[i]
    p.t = Math.min(p.t + dt / p.duration, 1)
    const mt = 1 - p.t
    p.obj.x = mt*mt*p.fromX + 2*mt*p.t*p.cx + p.t*p.t*p.toX
    p.obj.y = mt*mt*p.fromY + 2*mt*p.t*p.cy + p.t*p.t*p.toY
    // 尾迹粒子（每 2 帧 1 个，快速淡出）
    p.trailTimer = (p.trailTimer || 0) + dt
    if (p.trailTimer >= 0.033) {
      p.trailTimer -= 0.033
      const fc = (FX_PIXI[p.type] ?? FX_PIXI.damage).main
      const tg = new Graphics()
      tg.circle(0, 0, 1.0 + Math.random() * 1.2).fill({ color: fc })
      tg.x = p.obj.x + (Math.random() - 0.5) * 3
      tg.y = p.obj.y + (Math.random() - 0.5) * 3
      tg.alpha = 0.65
      _app.stage.addChild(tg)
      const tl = 0.10 + Math.random() * 0.08
      _particles.push({ obj: tg, vx: (Math.random()-0.5)*0.4, vy: (Math.random()-0.5)*0.4, life: tl, maxLife: tl })
    }
    // 自动朝飞行方向旋转（菱形尖端对准前方）
    if (p.t > 0.03) {
      const pt2 = Math.max(0, p.t - 0.05), pm2 = 1 - pt2
      const px  = pm2*pm2*p.fromX + 2*pm2*pt2*p.cx + pt2*pt2*p.toX
      const py  = pm2*pm2*p.fromY + 2*pm2*pt2*p.cy + pt2*pt2*p.toY
      p.obj.rotation = Math.atan2(p.obj.y - py, p.obj.x - px)
    }
    // 由小变大（入场感）
    p.obj.scale.set(0.5 + p.t * 0.7)
    if (p.t >= 1) {
      _app.stage.removeChild(p.obj); p.obj.destroy()
      _burst(p.toX, p.toY, p.type)
      p.onImpact?.(p.toX, p.toY)
      _projectiles.splice(i, 1)
    }
  }

  // 爆炸粒子
  for (let i = _particles.length - 1; i >= 0; i--) {
    const p = _particles[i]
    p.obj.x += p.vx; p.obj.y += p.vy
    p.vx *= 0.88;    p.vy *= 0.88
    p.life -= dt * 1.8
    p.obj.alpha = Math.max(0, p.life / p.maxLife)
    if (p.life <= 0) { _app.stage.removeChild(p.obj); p.obj.destroy(); _particles.splice(i, 1) }
  }

  // 冲击波环（逐帧重绘）
  for (let i = _rings.length - 1; i >= 0; i--) {
    const r = _rings[i]
    r.radius  += (52 - r.radius) * 0.22   // ease toward 52px
    r.life    -= dt * 2.8
    r.obj.alpha = Math.max(0, r.life)
    r.obj.clear()
    r.obj.circle(0, 0, r.radius).stroke({ color: r.color, width: Math.max(0.5, r.life * 2.5) })
    if (r.life <= 0) { _app.stage.removeChild(r.obj); r.obj.destroy(); _rings.splice(i, 1) }
  }
}
