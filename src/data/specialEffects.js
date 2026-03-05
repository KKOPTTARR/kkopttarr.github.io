import rawEffects from '../../config/specialEffects.json'
import { shuffle } from '../utils.js'

export const SPECIAL_EFFECTS = rawEffects

export function buildSkillCn(id, val) {
  switch (id) {
    case 'damageGrowth':   return `每发伤害 {dmg:+${val}}（本战）`
    case 'healGrowth':     return `每发治疗 {heal:+${val}}（本战）`
    case 'shieldGrowth':   return `每发护盾 {shield:+${val}}（本战）`
    case 'burnGrowth':     return `每发灼烧 {burn:+${val}}层（本战）`
    case 'poisonGrowth':   return `每发剧毒 {poison:+${val}}层（本战）`
    case 'multiTrigger':   return `{val:${val}}重触发`
    case 'adjacentCharge': return `相邻充能 {charge:${String(val / 1000)}s}`
    default: return ''
  }
}

// 随机选一个特效应用到物品实例，返回所选 effect
export function applyRandomEffect(inst) {
  const pool = [...SPECIAL_EFFECTS]; shuffle(pool)
  const effect = pool[0]
  const val = effect.values[inst.tier] ?? effect.values['Bronze']
  if (!inst.onTrigger) inst.onTrigger = {}
  inst.onTrigger[effect.id] = val
  const newSkill = buildSkillCn(effect.id, val)
  inst.skill_cn = inst.skill_cn?.trim() ? inst.skill_cn + '；' + newSkill : newSkill
  return effect
}
