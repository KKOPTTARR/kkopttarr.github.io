import IDENTITY_POOL   from '../../config/identities.json'
import ENEMY_TEMPLATES from '../../config/enemies.json'
import EVENT_POOL      from '../../config/events.json'

export { IDENTITY_POOL, EVENT_POOL }

// 根据 id 查找身份
export function findIdentity(id) {
  return IDENTITY_POOL.find(i => i.id === id) ?? null
}

// 根据战役场次返回对应难度的敌人（10场内均匀覆盖全部敌人）
const TOTAL_BATTLES = 5
export function getEnemyByBattle(battleCount) {
  const idx = Math.min(
    Math.floor(battleCount * ENEMY_TEMPLATES.length / TOTAL_BATTLES),
    ENEMY_TEMPLATES.length - 1
  )
  return ENEMY_TEMPLATES[idx]
}
