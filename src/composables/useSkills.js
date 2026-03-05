import SKILL_POOL from '../../config/skills.json'
import CHAPTERS   from '../../config/chapters.json'
import GC         from '../../config/gameConfig.json'
import { shuffle } from '../utils.js'

export { SKILL_POOL }

const { BATTLES_PER_CHAPTER, CHAPTER_COUNT, CHAPTER_SKILL_TIERS } = GC

// ── 工具 ──────────────────────────────────────────────────

export function getChapterNumber(battleCount) {
  return Math.floor(battleCount / BATTLES_PER_CHAPTER) + 1
}

export function getBattleInChapter(battleCount) {
  return (battleCount % BATTLES_PER_CHAPTER) + 1
}

export function isBossBattle(battleCount) {
  return getBattleInChapter(battleCount) === BATTLES_PER_CHAPTER
}

export function getChapterInfo(battleCount) {
  const chapter = getChapterNumber(battleCount)
  return CHAPTERS.find(c => c.chapter === chapter) ?? null
}

export function getChapterSkillTier(battleCount) {
  const chapter = getChapterNumber(battleCount)
  const idx = Math.min(chapter - 1, CHAPTER_SKILL_TIERS.length - 1)
  return CHAPTER_SKILL_TIERS[idx]
}

// ── 技能候选（BOSS后2选1）─────────────────────────────────

export function rollSkillCandidates(activeSkills, tier) {
  const ownedIds = new Set(activeSkills.map(s => s.id))
  const candidates = SKILL_POOL.filter(s => s.category === 'chapter' && !ownedIds.has(s.id))
  shuffle(candidates)
  return candidates.slice(0, 2).map(s => ({ ...s, tier }))
}

// ── 战斗开始技能应用 ───────────────────────────────────────

export function applyBattleStartSkills(activeSkills, playerStat, enemyStat) {
  for (const skill of activeSkills) {
    const base = SKILL_POOL.find(s => s.id === skill.id)
    if (!base || base.trigger !== 'battle_start') continue
    const val = base.tiers[skill.tier]?.value ?? 0
    if (val <= 0) continue
    switch (base.effect) {
      case 'shield': playerStat.shield += val; break
      case 'poison': enemyStat.poisonStacks = (enemyStat.poisonStacks || 0) + val; break
      case 'burn':   enemyStat.burnStacks   = (enemyStat.burnStacks   || 0) + val; break
      case 'damage': enemyStat.hp = Math.max(0, enemyStat.hp - val); break
    }
  }
}

// ── 章节事件权重 ───────────────────────────────────────────

export function getChapterEventWeights(battleCount, phase) {
  const info = getChapterInfo(battleCount)
  if (!info) return {}
  const bonusIds   = phase === 'pre' ? (info.preBonus   ?? []) : (info.postBonus   ?? [])
  const excludeIds = phase === 'pre' ? (info.preExclude ?? []) : (info.postExclude ?? [])
  const weights = {}
  for (const id of bonusIds)   weights[id] = GC.CHAPTER_EVENT_BONUS_WEIGHT
  for (const id of excludeIds) weights[id] = 0
  return weights
}
