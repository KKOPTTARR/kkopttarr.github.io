import IDENTITY_POOL   from '../../config/identities.json'
import ENEMY_TEMPLATES from '../../config/enemies.json'
import EVENT_POOL      from '../../config/events.json'
import GC              from '../../config/gameConfig.json'

const { ENEMY_HP_SCALE, ENEMY_DMG_SCALE, ENEMY_BASE_MULT, DIFFICULTY_HP_MULTS, SELECT_DIFFICULTIES } = GC

export { IDENTITY_POOL, EVENT_POOL }

// 根据 id 查找身份
export function findIdentity(id) {
  return IDENTITY_POOL.find(i => i.id === id) ?? null
}

// 根据模板 + 难度 + 当前轮次组装完整敌人对象
export function buildEnemy(template, difficulty, battleCount = 0) {
  const hpMult = DIFFICULTY_HP_MULTS[difficulty] ?? 1

  const hpScale  = Math.pow(ENEMY_HP_SCALE,  battleCount)
  const dmgScale = Math.pow(ENEMY_DMG_SCALE, battleCount)

  const baseAbilities =
    difficulty === 'normal'  ? template.normalAbilities :
    difficulty === 'elite'   ? [...template.normalAbilities, ...template.eliteAbilities] :
                               [...template.normalAbilities, ...template.eliteAbilities, ...template.radiantAbilities]

  const abilities = baseAbilities.map(ab => ({
    ...ab,
    damage: ab.damage ? Math.round(ab.damage * dmgScale * ENEMY_BASE_MULT) : 0,
    heal:   ab.heal   ? Math.round(ab.heal   * ENEMY_BASE_MULT) : 0,
    shield: ab.shield ? Math.round(ab.shield * ENEMY_BASE_MULT) : 0,
    burn:   ab.burn   ? Math.round(ab.burn   * ENEMY_BASE_MULT) : 0,
    poison: ab.poison ? Math.round(ab.poison * ENEMY_BASE_MULT) : 0,
  }))

  // template.hp is { normal, elite, radiant } — pick the right tier
  const baseHp = (template.hp && typeof template.hp === 'object')
    ? (template.hp[difficulty] ?? template.hp.normal ?? 100)
    : template.hp

  return {
    ...template,
    difficulty,
    hp: Math.round(baseHp * hpScale * ENEMY_BASE_MULT),
    abilities,
  }
}

// 随机抽取3个不重复敌人，分配普通/精英/辉耀难度
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
}

export function getSelectEnemies(battleCount = 0) {
  const pool = [...ENEMY_TEMPLATES]
  shuffle(pool)
  const picked = pool.slice(0, 3)
  return picked.map((t, i) => buildEnemy(t, SELECT_DIFFICULTIES[i], battleCount))
}
