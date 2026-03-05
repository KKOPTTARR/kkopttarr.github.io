/**
 * usePixiBattle — 战斗粒子特效系统
 *
 * - 浮字伤害数字（instanceId 版 + canvas 坐标版）
 * - 投射物 bezier 弧线飞行（玩家→敌方 / 敌方→玩家）
 * - 落点粒子爆炸
 * - 冲击波扩散环
 */

import { Application, Text, TextStyle, Graphics } from 'pixi.js'
import vfxConfig from '../../config/vfx.json'

const PROJ = vfxConfig.projectile

// ── 颜色表 ─────────────────────────────────────────────────────
const FX_CSS = {
  damage: '#ff6050', heal: '#5ad070', shield: '#70c8f0',
  burn:   '#e07030', poison: '#70b020', dot:    '#e07030',
  special: '#ffd060',
}
const FX_PIXI = {
  damage:  { main: 0xff5030, subs: [0xff8060, 0xffaa80] },
  burn:    { main: 0xff8020, subs: [0xffdd00, 0xff5000] },
  poison:  { main: 0x80cc20, subs: [0x50aa10, 0xaaee40] },
  heal:    { main: 0x40dd70, subs: [0x20aa50, 0x80ffaa] },
  shield:  { main: 0x80d0ff, subs: [0x40a0dd, 0xb0e8ff] },
  dot:     { main: 0xe07030, subs: [0xff8040, 0xffaa60] },
  special: { main: 0xffd060, subs: [0xffaa20, 0xffee80] },
}

let _app    = null
let _canvas = null
let _pixiSpeed = 1
export function setPixiSpeed(s) { _pixiSpeed = s }

const _floats      = []
const _arcs        = []
const _particles   = []
const _rings       = []
const _stars       = []
const _projectiles = []

// ── 初始化 / 销毁 ──────────────────────────────────────────────
export async function initPixi() {
  if (_app) { _app.destroy(true); _app = null }
  if (_canvas) { _canvas.remove(); _canvas = null }

  _canvas = document.createElement('canvas')
  _canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:999'
  document.body.appendChild(_canvas)

  const tmp = new Application()
  await tmp.init({
    canvas: _canvas, backgroundAlpha: 0, antialias: true,
    autoDensity: true, resolution: window.devicePixelRatio || 1,
    resizeTo: window,
  })
  _app = tmp
  _app.ticker.add(_tick)
}

export function destroyPixi() {
  if (_app) { _app.destroy(true); _app = null }
  if (_canvas) { _canvas.remove(); _canvas = null }
  _floats.length = _arcs.length = _particles.length = _rings.length = _stars.length = _projectiles.length = 0
}

// ── 浮字（canvas 坐标，落点专用）─────────────────────────────
export function spawnFloatingTextAt(x, y, text, type) {
  if (!_app) return
  _addFloat(x, y, text, type)
}

// ── 闪电辅助：在 gfx 上绘制锯齿路径 ─────────────────────────
function _drawLightning(gfx, x1, y1, x2, y2, spread) {
  const segs = 5 + Math.floor(Math.random() * 3)
  const dx = x2 - x1, dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  const px = -dy / len, py = dx / len
  const pts = [[x1, y1]]
  for (let i = 1; i < segs; i++) {
    const t    = i / segs
    const disp = (Math.random() - 0.5) * spread
    pts.push([x1 + dx * t + px * disp, y1 + dy * t + py * disp])
  }
  pts.push([x2, y2])
  gfx.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) gfx.lineTo(pts[i][0], pts[i][1])
}

// ── 相邻充能：闪电（卡牌 → 邻居卡牌）────────────────────────
export function spawnChargeArc(fromId, toId) {
  if (!_app) return
  const cr     = _app.canvas.getBoundingClientRect()
  const fromEl = document.querySelector(`[data-instance="${fromId}"]`)
  const toEl   = document.querySelector(`[data-instance="${toId}"]`)
  if (!fromEl || !toEl) return
  const fr = fromEl.getBoundingClientRect()
  const tr = toEl.getBoundingClientRect()
  const fx = fr.left + fr.width  / 2 - cr.left
  const fy = fr.top  + fr.height / 2 - cr.top
  const tx = tr.left + tr.width  / 2 - cr.left
  const ty = tr.top  + tr.height / 2 - cr.top

  // 外晕闪电
  const mainGlow = new Graphics()
  _drawLightning(mainGlow, fx, fy, tx, ty, 14)
  mainGlow.stroke({ color: 0x2080ff, width: 8, alpha: 0.28 })
  _app.stage.addChild(mainGlow)

  // 主闪电
  const mainLine = new Graphics()
  _drawLightning(mainLine, fx, fy, tx, ty, 10)
  mainLine.stroke({ color: 0xe8f6ff, width: 2, alpha: 0.95 })
  _app.stage.addChild(mainLine)
  _arcs.push({ glow: mainGlow, line: mainLine, life: 1.0, decayRate: 2.0 })

  // 副闪电（更抖）
  const subLine = new Graphics()
  _drawLightning(subLine, fx, fy, tx, ty, 20)
  subLine.stroke({ color: 0xa0d8ff, width: 1, alpha: 0.6 })
  _app.stage.addChild(subLine)
  _arcs.push({ glow: null, line: subLine, life: 1.0, decayRate: 2.6 })

  // 落点粒子
  setTimeout(() => {
    if (!_app) return
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      const spd   = 1.5 + Math.random() * 2
      const g     = new Graphics()
      g.circle(0, 0, 1.5 + Math.random()).fill({ color: Math.random() > 0.5 ? 0xffffff : 0x80d8ff })
      g.x = tx + (Math.random() - 0.5) * 6
      g.y = ty + (Math.random() - 0.5) * 6
      _app.stage.addChild(g)
      const life = 0.2 + Math.random() * 0.15
      _particles.push({ obj: g, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd, life, maxLife: life })
    }
  }, Math.round(40 / _pixiSpeed))
}

// ── DoT 浮字（在受击方显示伤害数字）─────────────────────────
export function spawnDotFloatingText(isEnemyTarget, value, type) {
  if (!_app) return
  const cr  = _app.canvas.getBoundingClientRect()
  const sel = isEnemyTarget ? '.enemy-portrait-wrap' : '.arena-grid'
  const el  = document.querySelector(sel)
  if (!el) return
  const r = el.getBoundingClientRect()
  const x = r.left + r.width  * (0.25 + Math.random() * 0.5) - cr.left
  const y = r.top  + r.height * (0.15 + Math.random() * 0.45) - cr.top
  _addFloat(x, y, `-${value}`, type === 'burn' ? 'burn' : 'poison')
}

// ── DoT 命中粒子（在受击方位置散射小粒子）────────────────────
export function spawnDotHit(isEnemy, type) {
  if (!_app) return
  const cr  = _app.canvas.getBoundingClientRect()
  const sel = isEnemy
    ? '.enemy-portrait-wrap'
    : '.arena-grid'
  const el = document.querySelector(sel)
  if (!el) return
  const r   = el.getBoundingClientRect()
  const cx  = r.left + r.width  * (0.3 + Math.random() * 0.4) - cr.left
  const cy  = r.top  + r.height * (0.2 + Math.random() * 0.6) - cr.top
  const fx  = FX_PIXI[type] ?? FX_PIXI.dot
  const cnt = 24
  for (let i = 0; i < cnt; i++) {
    const angle = Math.random() * Math.PI * 2
    const spd   = 1.2 + Math.random() * 2.2
    const sz    = 1 + Math.random() * 2
    const g     = new Graphics()
    g.circle(0, 0, sz).fill({ color: fx.main })
    g.x = cx + (Math.random() - 0.5) * 14
    g.y = cy + (Math.random() - 0.5) * 14
    _app.stage.addChild(g)
    const life = 0.35 + Math.random() * 0.25
    _particles.push({ obj: g, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd - 0.8, life, maxLife: life })
  }
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

// ── 攻击光弧 ──────────────────────────────────────────────────
/**
 * 从攻击源向目标划出快速消散的彩色光弧，onImpact 在弧线峰值时触发
 * @param {string|null} instanceId  玩家卡牌 instanceId（isEnemy=false 时使用）
 * @param {boolean}     isEnemy     true = 敌方攻击
 * @param {string}      type        damage/burn/poison/heal/shield
 * @param {function}    onImpact    落点回调 (toX, toY) => void
 */
export function spawnAttackArc(instanceId, isEnemy, type, onImpact) {
  if (!_app) return
  const cr = _app.canvas.getBoundingClientRect()
  let fromX, fromY, toX, toY

  const targetsSelf = type === 'heal' || type === 'shield'
  if (!isEnemy) {
    const src = instanceId ? document.querySelector(`[data-instance="${instanceId}"]`) : null
    if (!src) return
    const sr = src.getBoundingClientRect()
    fromX = sr.left + sr.width  / 2 - cr.left
    fromY = sr.top  + sr.height / 2 - cr.top
    if (targetsSelf) {
      const dst = document.querySelector('.arena-grid')
      if (!dst) return
      const dr = dst.getBoundingClientRect()
      toX = dr.left + dr.width  * (0.1 + Math.random() * 0.8) - cr.left
      toY = dr.top  + dr.height * (0.2  + Math.random() * 0.6) - cr.top
    } else {
      const dst = document.querySelector('.enemy-portrait-wrap') ?? document.querySelector('.enemy-section')
      if (!dst) return
      const dr = dst.getBoundingClientRect()
      toX = dr.left + dr.width  / 2 - cr.left
      toY = dr.top  + dr.height / 2 - cr.top
    }
  } else {
    const src = document.querySelector('.enemy-portrait-wrap') ?? document.querySelector('.enemy-section')
    if (!src) return
    const sr = src.getBoundingClientRect()
    fromX = sr.left + sr.width  / 2 - cr.left
    fromY = sr.top  + sr.height / 2 - cr.top
    if (targetsSelf) {
      toX = fromX + (Math.random() - 0.5) * sr.width  * 0.6
      toY = fromY + (Math.random() - 0.5) * sr.height * 0.6
    } else {
      const dst = document.querySelector('.arena-grid')
      if (!dst) return
      const dr = dst.getBoundingClientRect()
      toX = dr.left + dr.width  * (0.25 + Math.random() * 0.5) - cr.left
      toY = dr.top  + dr.height * (0.2  + Math.random() * 0.6) - cr.top
    }
  }

  const fx        = FX_PIXI[type] ?? FX_PIXI.damage
  const isSelfBuff = type === 'heal' || type === 'shield'
  const cpx = (fromX + toX) / 2 + (Math.random() - 0.5) * 50
  const cpy = Math.min(fromY, toY) - 40 - Math.random() * 20

  // 源点爆发（卡牌发射时的小粒子）
  if (!isSelfBuff) {
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2
      const spd   = 1.8 + Math.random() * 2.2
      const g = new Graphics()
      g.circle(0, 0, 1.5 + Math.random() * 1.5).fill({ color: fx.subs[0] })
      g.x = fromX; g.y = fromY
      _app.stage.addChild(g)
      const life = 0.25 + Math.random() * 0.15
      _particles.push({ obj: g, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd, life, maxLife: life })
    }
  }

  // 外晕弧（粗、低透明度）
  const glow = new Graphics()
  glow.moveTo(fromX, fromY).quadraticCurveTo(cpx, cpy, toX, toY)
  glow.stroke({ color: fx.main, width: 18, alpha: 0.35 })
  _app.stage.addChild(glow)

  // 主弧线（细、高亮）
  const line = new Graphics()
  line.moveTo(fromX, fromY).quadraticCurveTo(cpx, cpy, toX, toY)
  line.stroke({ color: fx.subs[0], width: 4, alpha: 1.0 })
  _app.stage.addChild(line)

  _arcs.push({ glow, line, life: 1.0, decayRate: isSelfBuff ? 1.8 : 3.2 })

  // 投射物头部（伤害/灼烧/剧毒专用）
  if (!isSelfBuff) {
    const projColor = { damage: 0xffffff, burn: 0xff9040, poison: 0x88dd20, dot: 0xff8030 }
    const projSize  = { damage: 5.5, burn: 6, poison: 6.5, dot: 5 }
    const projSpeed = { damage: 2.4, burn: 1.8, poison: 1.1, dot: 1.5 }
    const head = new Graphics()
    head.circle(0, 0, projSize[type] ?? 5).fill({ color: projColor[type] ?? 0xffffff })
    head.x = fromX; head.y = fromY
    _app.stage.addChild(head)
    _projectiles.push({ obj: head, x0: fromX, y0: fromY, cpx, cpy, x1: toX, y1: toY, t: 0, speed: projSpeed[type] ?? 2.0, type })
  }

  // 落点效果稍微延迟，让弧线先出现
  const delay = Math.round(80 / _pixiSpeed)
  setTimeout(() => {
    _burst(toX, toY, type)
    onImpact?.(toX, toY)
  }, delay)
}

// ── 特殊效果：星形爆发 ────────────────────────────────────────
function _makeStar(size) {
  const g = new Graphics()
  const pts = []
  const outerR = size, innerR = size * 0.4
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5 - Math.PI / 2
    const r = i % 2 === 0 ? outerR : innerR
    pts.push(Math.cos(angle) * r, Math.sin(angle) * r)
  }
  const palette = [0xffd700, 0xffffff, 0xffcc00, 0xffaa20]
  g.poly(pts).fill({ color: palette[Math.floor(Math.random() * palette.length)] })
  return g
}

export function spawnSpecialBurst(instanceId) {
  if (!_app) return
  const el = document.querySelector(`[data-instance="${instanceId}"]`)
  if (!el) return
  const r  = el.getBoundingClientRect()
  const cr = _app.canvas.getBoundingClientRect()
  const cx = r.left + r.width  / 2 - cr.left
  const cy = r.top  + r.height / 2 - cr.top
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 + Math.random() * 0.4
    const speed = 3.5 + Math.random() * 5
    const star  = _makeStar(4 + Math.random() * 5)
    star.x = cx; star.y = cy
    star.rotation = Math.random() * Math.PI * 2
    _app.stage.addChild(star)
    _stars.push({
      obj: star,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      vr: (Math.random() - 0.5) * 0.28,
      life: 0.75 + Math.random() * 0.35,
    })
  }
}

// ── 胜利爆发 ──────────────────────────────────────────────
export function spawnVictoryBurst() {
  if (!_app) return
  const W = _app.canvas.width
  const H = _app.canvas.height
  // 分批多点爆炸
  for (let i = 0; i < 10; i++) {
    setTimeout(() => {
      if (!_app) return
      const x = W * (0.08 + Math.random() * 0.84)
      const y = H * (0.08 + Math.random() * 0.55)
      _burst(x, y, 'special')
    }, i * 160 / _pixiSpeed)
  }
  // 从屏幕中心射出星星
  const cx = W / 2, cy = H * 0.38
  for (let i = 0; i < 28; i++) {
    const angle = (i / 28) * Math.PI * 2 + Math.random() * 0.3
    const speed = 3.5 + Math.random() * 7
    const star  = _makeStar(5 + Math.random() * 8)
    star.x = cx + (Math.random() - 0.5) * 100
    star.y = cy + (Math.random() - 0.5) * 80
    star.rotation = Math.random() * Math.PI * 2
    _app.stage.addChild(star)
    _stars.push({
      obj: star,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      vr: (Math.random() - 0.5) * 0.32,
      life: 1.4 + Math.random() * 1.0,
    })
  }
}

// ── 落点爆炸粒子 + 冲击波环 ──────────────────────────────────
function _burst(x, y, type) {
  if (!_app) return
  const fx    = FX_PIXI[type] ?? FX_PIXI.damage
  const count = 40

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.6
    const spd   = 3.2 + Math.random() * 5.0
    const sz    = 1.5 + Math.random() * 3.5
    const col   = Math.random() > 0.4
      ? fx.main
      : fx.subs[Math.floor(Math.random() * fx.subs.length)]
    const g = new Graphics()
    g.circle(0, 0, sz).fill({ color: col })
    g.x = x; g.y = y
    _app.stage.addChild(g)
    const life = 0.55 + Math.random() * 0.35
    _particles.push({ obj: g, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd, life, maxLife: life })
  }

  // 冲击波环（双环）
  const ring = new Graphics()
  ring.x = x; ring.y = y
  _app.stage.addChild(ring)
  const ringDecay = (type === 'heal' || type === 'shield') ? 1.2 : 2.2
  _rings.push({ obj: ring, color: fx.main, radius: 6, maxRadius: 140, strokeWidth: 5, life: 1.0, decayRate: ringDecay })

  const ring2 = new Graphics()
  ring2.x = x; ring2.y = y
  _app.stage.addChild(ring2)
  _rings.push({ obj: ring2, color: fx.subs[0], radius: 4, maxRadius: 90, strokeWidth: 2.5, life: 0.8, decayRate: ringDecay * 1.6 })
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

  // 攻击光弧 / 闪电淡出
  for (let i = _arcs.length - 1; i >= 0; i--) {
    const a = _arcs[i]
    a.life -= dt * (a.decayRate ?? 5.5)
    if (a.life <= 0) {
      if (a.glow) { _app.stage.removeChild(a.glow); a.glow.destroy() }
      if (a.line) { _app.stage.removeChild(a.line); a.line.destroy() }
      _arcs.splice(i, 1)
    } else {
      if (a.glow) a.glow.alpha = a.life * 0.28
      if (a.line) a.line.alpha = a.life
    }
  }

  // 投射物头部（沿贝塞尔曲线运动）
  for (let i = _projectiles.length - 1; i >= 0; i--) {
    const p  = _projectiles[i]
    p.t = Math.min(1, p.t + dt * p.speed)
    const mt = 1 - p.t
    const bx = mt*mt*p.x0 + 2*mt*p.t*p.cpx + p.t*p.t*p.x1
    const by = mt*mt*p.y0 + 2*mt*p.t*p.cpy + p.t*p.t*p.y1
    p.obj.x = bx; p.obj.y = by
    p.obj.alpha = p.t > 0.85 ? Math.max(0, (1 - p.t) / 0.15) : 1
    if (p.type === 'burn' && Math.random() < 0.5) {
      const g = new Graphics()
      g.circle(0, 0, 1 + Math.random()).fill({ color: 0xff6010 })
      g.x = bx + (Math.random() - 0.5) * 3; g.y = by + (Math.random() - 0.5) * 3
      _app.stage.addChild(g)
      const life = 0.1 + Math.random() * 0.08
      _particles.push({ obj: g, vx: (Math.random()-0.5)*0.8, vy: -0.8 - Math.random()*0.5, life, maxLife: life })
    }
    if (p.t >= 1) { _app.stage.removeChild(p.obj); p.obj.destroy(); _projectiles.splice(i, 1) }
  }

  // 星形粒子
  for (let i = _stars.length - 1; i >= 0; i--) {
    const s = _stars[i]
    s.obj.x += s.vx; s.obj.y += s.vy
    s.vx *= 0.91;    s.vy *= 0.91
    s.obj.rotation += s.vr
    s.life -= dt * 1.5
    s.obj.alpha = Math.max(0, s.life)
    if (s.life <= 0) { _app.stage.removeChild(s.obj); s.obj.destroy(); _stars.splice(i, 1) }
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
    r.radius  += (r.maxRadius - r.radius) * 0.22
    r.life    -= dt * (r.decayRate ?? 2.8)
    r.obj.alpha = Math.max(0, r.life)
    r.obj.clear()
    r.obj.circle(0, 0, r.radius).stroke({ color: r.color, width: Math.max(0.5, r.life * r.strokeWidth) })
    if (r.life <= 0) { _app.stage.removeChild(r.obj); r.obj.destroy(); _rings.splice(i, 1) }
  }
}
