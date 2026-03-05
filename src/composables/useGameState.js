import { ref, reactive } from 'vue'
import GC from '../../config/gameConfig.json'

const { MAX_LIVES } = GC

export function useGameState() {
  // ── 游戏进程 ────────────────────────────────────────────
  const phase       = ref('HOME')
  const battleCount = ref(0)
  const wins        = ref(0)
  const lives       = ref(MAX_LIVES)
  const resultType  = ref('win')

  // ── UI 提示 ─────────────────────────────────────────────
  const mergeFlash  = ref('')

  // ── 身份 ────────────────────────────────────────────────
  const identitySkill        = ref(null)
  const identityIcon         = ref('')
  const skillTooltipVisible  = ref(false)
  const selectedIdentityName = ref('')

  // ── 战斗配置 ────────────────────────────────────────────
  const battleSpeed        = ref(1)
  const battleItemStats    = ref([])
  const selectedDifficulty = ref('normal')

  // ── 当前敌人 ────────────────────────────────────────────
  const currentEnemy  = ref({ name: '', hp: 0, abilities: [], portrait: '' })
  const selectEnemies = ref([])

  // ── 物品容器 ────────────────────────────────────────────
  const playerItems    = reactive([])
  const backpackItems  = reactive([])
  const enemyAbilities = reactive([])

  // ── 战斗双方属性 ────────────────────────────────────────
  const playerStat = reactive({ hp: 500, maxHp: 500, shield: 0, burnStacks: 0, poisonStacks: 0 })
  const enemyStat  = reactive({ hp: 200, maxHp: 200, shield: 0, burnStacks: 0, poisonStacks: 0 })

  // ── 技能 ────────────────────────────────────────────────
  const activeSkills = reactive([])

  // ── 奖励 & UI ───────────────────────────────────────────
  const pendingRewards  = ref([])
  const showBackpack    = ref(false)
  const battleScreenRef = ref(null)

  // ── 重置（新游戏）──────────────────────────────────────
  function resetState() {
    phase.value            = 'HOME'
    battleCount.value      = 0
    wins.value             = 0
    lives.value            = MAX_LIVES
    resultType.value       = 'win'
    mergeFlash.value       = ''
    identitySkill.value    = null
    identityIcon.value     = ''
    skillTooltipVisible.value = false
    selectedIdentityName.value = ''
    battleSpeed.value      = 1
    battleItemStats.value  = []
    selectedDifficulty.value = 'normal'
    currentEnemy.value     = { name: '', hp: 0, abilities: [], portrait: '' }
    selectEnemies.value    = []
    pendingRewards.value   = []
    showBackpack.value     = false
    playerItems.splice(0)
    backpackItems.splice(0)
    enemyAbilities.splice(0)
    activeSkills.splice(0)
    Object.assign(playerStat, { hp: 500, maxHp: 500, shield: 0, burnStacks: 0, poisonStacks: 0 })
    Object.assign(enemyStat,  { hp: 200, maxHp: 200, shield: 0, burnStacks: 0, poisonStacks: 0 })
  }

  return {
    phase, battleCount, wins, lives, resultType,
    mergeFlash,
    identitySkill, identityIcon, skillTooltipVisible, selectedIdentityName,
    battleSpeed, battleItemStats, selectedDifficulty,
    currentEnemy, selectEnemies,
    playerItems, backpackItems, enemyAbilities,
    playerStat, enemyStat,
    activeSkills,
    pendingRewards, showBackpack, battleScreenRef,
    resetState,
  }
}
