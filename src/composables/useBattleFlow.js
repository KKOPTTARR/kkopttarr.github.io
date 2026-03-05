import { ref, computed, nextTick } from 'vue'
import { startBattle, stopBattle } from './useBattle.js'
import { rollRewardItems, rewardAnim } from './useRewards.js'
import { sleep } from '../utils.js'
import GC from '../../config/gameConfig.json'
import { SKILL_POOL, isBossBattle, applyBattleStartSkills, rollSkillCandidates, getChapterSkillTier, getChapterInfo } from './useSkills.js'

const { STORM_SHIELD, WINS_TO_CLEAR, BOSS_HP_MULT } = GC

// ── 单例状态（供 App.vue template 监听）────────────────────
export const battleFlash      = ref(false)
export const latestAttack     = ref(null)
export const battleEndResult  = ref(null)   // null | 'win' | 'lose'
export const playerHitType = ref(null)
export const enemyHitType  = ref(null)
export const playerHitClass = computed(() => playerHitType.value ? `hit-${playerHitType.value}` : '')
export const enemyHitClass  = computed(() => enemyHitType.value  ? `hit-${enemyHitType.value}`  : '')

// ── Composable ────────────────────────────────────────────
export function useBattleFlow({
  phase, playerStat, enemyStat, playerItems, enemyAbilities,
  battleItemStats, stormBlessingActive, stormShieldAmount, breakBoatsBuff, battleScreenRef, unlockedCols,
  wins, lives, selectedDifficulty, resultType,
  identitySkill, currentEnemy, activeSkills, battleCount,
  skillCandidates,
  deliverRewards, afterBattleComplete,
}) {
  function captureSourceRects() {
    const rects = {}
    const CELL = 88, GAP = 4
    const _calc = (containerEl, items) => {
      if (!containerEl) return
      const cr = containerEl.getBoundingClientRect()
      for (const item of items) {
        rects[item.instanceId] = { left: cr.left + item.col * (CELL + GAP), top: cr.top, width: CELL, height: CELL }
      }
    }
    _calc(
      document.querySelector('.player-section .grid-container') ||
      document.querySelector('.formation-panel .grid-container'),
      playerItems
    )
    return rects
  }

  function captureDestRects() {
    const rects = {}
    const GAP = 4
    const _calc = (gridEl, items) => {
      if (!gridEl) return
      const cr   = gridEl.getBoundingClientRect()
      const uc   = unlockedCols.value
      const colW = (cr.width - (uc - 1) * GAP) / uc
      for (const item of items) {
        rects[item.instanceId] = { left: cr.left + item.col * (colW + GAP), top: cr.top, width: colW, height: cr.height }
      }
    }
    _calc(document.querySelector('.player-section .arena-grid'), playerItems)
    return rects
  }

  function handleHpChange(who, hp, shield, changeType = 'damage') {
    if (who === 'player') {
      playerStat.hp = hp; playerStat.shield = shield
      playerHitType.value = changeType
      setTimeout(() => { playerHitType.value = null }, 460)
    } else {
      enemyStat.hp = hp; enemyStat.shield = shield
      enemyHitType.value = changeType
      setTimeout(() => { enemyHitType.value = null }, 460)
    }
  }

  async function handleBattleEnd(result, stats = []) {
    stopBattle()
    battleItemStats.value = stats
    battleEndResult.value = result

    await sleep(result === 'win' ? 2000 : 1500)

    const isWin  = result === 'win'
    const isBoss = isBossBattle(battleCount.value)

    if (isWin) {
      wins.value++
      resultType.value = 'win'
      if (isBoss) {
        const tier = getChapterSkillTier(battleCount.value)
        skillCandidates.value = rollSkillCandidates(activeSkills, tier)
      }
    } else {
      lives.value--
      resultType.value = lives.value <= 0 ? 'gameover' : 'lose'
    }

    const rewards = rollRewardItems(selectedDifficulty.value, isWin, currentEnemy.value.dropBias ?? [])
    rewardAnim.isConsolation = !isWin
    rewardAnim.result    = result
    rewardAnim.livesLeft = lives.value

    battleCount.value++
    battleEndResult.value = null

    await deliverRewards(rewards)

    afterBattleComplete(isBoss)
  }

  async function startActualBattle() {
    const srcRects = captureSourceRects()

    battleFlash.value = true
    await sleep(600)
    battleFlash.value = false

    phase.value = 'BATTLE'
    playerStat.hp = playerStat.maxHp; playerStat.shield = 0
    playerStat.burnStacks = 0; playerStat.poisonStacks = 0
    enemyStat.hp = enemyStat.maxHp; enemyStat.shield = 0
    enemyStat.burnStacks = 0; enemyStat.poisonStacks = 0
    battleItemStats.value = []
    if (stormBlessingActive.value) {
      playerStat.shield = stormShieldAmount.value
      stormBlessingActive.value = false
      stormShieldAmount.value = 0
    }
    if (breakBoatsBuff.value) {
      const b = breakBoatsBuff.value
      if (b.damage) enemyStat.hp     = Math.max(0, enemyStat.hp - b.damage)
      if (b.shield) playerStat.shield += b.shield
      if (b.heal)   playerStat.hp    = Math.min(playerStat.maxHp, playerStat.hp + b.heal)
      if (b.burn)   enemyStat.burnStacks   += b.burn
      if (b.poison) enemyStat.poisonStacks += b.poison
      breakBoatsBuff.value = null
    }
    await nextTick()
    await new Promise(r => requestAnimationFrame(r))

    const dstRects = captureDestRects()
    battleScreenRef.value?.startDeploy(srcRects, dstRects)
  }

  function onDeployComplete() {
    battleScreenRef.value?.onBattleStart()
    startBattle(playerItems, enemyAbilities, playerStat, enemyStat, {
      onHpChange:    handleHpChange,
      onBattleEnd:   handleBattleEnd,
      onAttack:      (info) => { latestAttack.value = { ...info, _t: Date.now() } },
      identitySkill: identitySkill?.value ?? null,
      activeSkills,
      skillPool: SKILL_POOL,
    })
    applyBattleStartSkills(activeSkills, playerStat, enemyStat)
  }

  return { startActualBattle, onDeployComplete }
}
