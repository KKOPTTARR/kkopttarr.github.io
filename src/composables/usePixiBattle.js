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

let _app = null
let _pixiSpeed = 1
export function setPixiSpeed(s) { _pixiSpeed = s }

const _floats      = []
const _projectiles = []
const _particles   = []
const _rings       = []
const _stars       = []

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
  _floats.length = _projectiles.length = _particles.length = _rings.length = _stars.length = 0
}

// ── 空存根（兼容旧调用）──────────────────────────────────────
export function registerSprites() {}
export function syncPositions()   {}
export function setItems()        {}
export function drawSynergyLine() {}

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

  const trailG = new Graphics()
  _app.stage.addChild(trailG)          // 先加，渲染在投射物下方

  const proj = _makeComet(type)
  proj.x = fromX; proj.y = fromY
  _app.stage.addChild(proj)
  _projectiles.push({ obj: proj, trailG, fromX, fromY, toX, toY, cx, cy, t: 0, duration: PROJ.duration, type, onImpact })
}

// 彗星弹头：同心圆发光核（外晕 → 中晕 → 亮核 → 白热点）
function _makeComet(type) {
  const g  = new Graphics()
  const fx = FX_PIXI[type] ?? FX_PIXI.damage
  g.circle(0, 0, 18).fill({ color: fx.main,    alpha: 0.15 })  // 软外晕
  g.circle(0, 0, 10).fill({ color: fx.main,    alpha: 0.45 })  // 中晕
  g.circle(0, 0,  5).fill({ color: fx.subs[0], alpha: 0.92 })  // 亮核
  g.circle(0, 0,  2).fill({ color: 0xffffff,   alpha: 0.85 })  // 白热点
  return g
}

// ── 特殊效果：卡牌位置粒子爆发（加强版）────────────────────
export function spawnCardBurst(instanceId) {
  if (!_app) return
  const el = document.querySelector(`[data-instance="${instanceId}"]`)
  if (!el) return
  const r  = el.getBoundingClientRect()
  const cr = _app.canvas.getBoundingClientRect()
  const x  = r.left + r.width  / 2 - cr.left
  const y  = r.top  + r.height / 2 - cr.top
  const fx = FX_PIXI.special

  // 粒子：数量 × 2，速度更快，颗粒更大
  for (let i = 0; i < 20; i++) {
    const angle = (i / 20) * Math.PI * 2 + (Math.random() - 0.5) * 0.5
    const spd   = 5 + Math.random() * 8
    const sz    = 2.5 + Math.random() * 4
    const col   = Math.random() > 0.4
      ? fx.main
      : fx.subs[Math.floor(Math.random() * fx.subs.length)]
    const g = new Graphics()
    g.circle(0, 0, sz).fill({ color: col })
    g.x = x; g.y = y
    _app.stage.addChild(g)
    const life = 0.6 + Math.random() * 0.4
    _particles.push({ obj: g, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd, life, maxLife: life })
  }

  // 双冲击波：内环小而快，外环大而慢
  for (const [maxR, delay, sw] of [[80, 0, 4], [130, 80, 2.5]]) {
    const ring = new Graphics()
    ring.x = x; ring.y = y; ring.alpha = 0
    _app.stage.addChild(ring)
    setTimeout(() => { ring.alpha = 1 }, delay)
    _rings.push({ obj: ring, color: fx.main, radius: 6, maxRadius: maxR, strokeWidth: sw, life: 1.0 })
  }
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
  _rings.push({ obj: ring, color: fx.main, radius: 4, maxRadius: 52, strokeWidth: 2.5, life: 1.0 })
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
    // 彗星尾迹：在贝塞尔曲线上均匀采样，与速度/帧率完全无关
    const TRAIL_STEPS = PROJ.trailSteps
    const TRAIL_REACH = PROJ.trailReach
    const fx = FX_PIXI[p.type] ?? FX_PIXI.damage
    p.trailG.clear()
    for (let j = 0; j <= TRAIL_STEPS; j++) {
      const ts = p.t - (j / TRAIL_STEPS) * Math.min(p.t, TRAIL_REACH)
      if (ts < 0) break
      const ms = 1 - ts
      const sx   = ms*ms*p.fromX + 2*ms*ts*p.cx + ts*ts*p.toX
      const sy   = ms*ms*p.fromY + 2*ms*ts*p.cy + ts*ts*p.toY
      const frac = 1 - j / TRAIL_STEPS   // 1=弹头端 → 0=尾尖
      p.trailG.circle(sx, sy, frac * 20 + 1  ).fill({ color: fx.main,    alpha: frac * 0.18 })
      p.trailG.circle(sx, sy, frac *  7 + 0.3).fill({ color: fx.subs[0], alpha: frac * 0.88 })
    }
    if (p.t >= 1) {
      _app.stage.removeChild(p.obj); p.obj.destroy()
      p.trailG.clear(); _app.stage.removeChild(p.trailG); p.trailG.destroy()
      _burst(p.toX, p.toY, p.type)
      p.onImpact?.(p.toX, p.toY)
      _projectiles.splice(i, 1)
    }
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
    r.life    -= dt * 2.8
    r.obj.alpha = Math.max(0, r.life)
    r.obj.clear()
    r.obj.circle(0, 0, r.radius).stroke({ color: r.color, width: Math.max(0.5, r.life * r.strokeWidth) })
    if (r.life <= 0) { _app.stage.removeChild(r.obj); r.obj.destroy(); _rings.splice(i, 1) }
  }
}
