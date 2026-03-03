<template>
  <div class="report-screen">

    <!-- 结果 Banner -->
    <div class="result-banner" :class="result === 'clear' ? 'banner-clear' : result === 'win' ? 'banner-win' : 'banner-lose'">
      <span class="result-icon">{{ isWin ? '🏆' : '💀' }}</span>
      <div class="result-text">
        <span class="result-title">{{ isWin ? '胜利！' : '战败...' }}</span>
        <span class="result-sub">第 {{ battleCount + 1 }} 战 · 对手：{{ enemyName }}</span>
      </div>
      <div class="result-progress">
        <span class="progress-wins">{{ wins }}/5 胜</span>
        <span class="progress-lives">士气 {{ livesText }}</span>
        <span v-if="isFirstLoss" class="progress-hint">士气耗尽则游戏结束</span>
      </div>
    </div>

    <!-- 我方战绩 -->
    <div class="stats-section" v-if="sortedStats.length">
      <div class="stats-title">⚔️ 我方战绩</div>
      <div class="stats-list">
        <div
          v-for="s in sortedStats"
          :key="s.instanceId"
          class="stat-row"
        >
          <img
            :src="getIconUrl(s.name_en, s.tier)"
            class="stat-icon"
            :alt="s.name_cn"
            draggable="false"
          />
          <div class="stat-name">
            <span class="stat-item-name">{{ s.name_cn }}</span>
            <span class="stat-tier" :class="`tier-text-${s.tier}`">{{ tierLabel(s.tier) }}</span>
          </div>
          <div class="stat-nums">
            <span v-if="s.damage  > 0" class="stat-num dmg">⚔️ {{ s.damage }}</span>
            <span v-if="s.heal    > 0" class="stat-num hel">💚 {{ s.heal }}</span>
            <span v-if="s.shield  > 0" class="stat-num shd">🛡 {{ s.shield }}</span>
            <span v-if="s.burn    > 0" class="stat-num brn">🔥 {{ s.burn }}</span>
            <span v-if="s.poison  > 0" class="stat-num psn">☠ {{ s.poison }}</span>
            <span v-if="noContrib(s)" class="stat-num none">未出手</span>
          </div>
        </div>
      </div>
      <!-- 总计 -->
      <div class="stats-total">
        <span>总输出</span>
        <span class="total-dmg">⚔️ {{ totalDamage }}</span>
        <span v-if="totalHeal > 0" class="total-hel">💚 {{ totalHeal }}</span>
      </div>
    </div>

    <!-- 未使用物品提示 -->
    <div class="no-items" v-else>
      <span>未部署任何物品</span>
    </div>

    <!-- 战利品预览 -->
    <div class="reward-preview" v-if="rewardItems.length">
      <div class="stats-title">🎁 战利品（继续后发放）</div>
      <div class="reward-row">
        <div v-for="(item, i) in rewardItems" :key="i" class="reward-thumb">
          <img :src="getIconUrl(item.name_en, item.tier)" class="reward-thumb-img" draggable="false" />
          <div class="reward-thumb-tier" :class="`merge-tier-${item.tier}`">
            {{ { Bronze:'铜', Silver:'银', Gold:'金' }[item.tier] }}
          </div>
          <span class="reward-thumb-name">{{ item.name_cn }}</span>
        </div>
      </div>
    </div>

    <!-- 按钮 -->
    <div class="report-actions">
      <button class="btn btn-primary next-btn" @click="$emit('next')">
        {{ isEndGame ? '重新开始' : '继续冒险 →' }}
      </button>
    </div>

  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getIconUrl } from '../data/items.js'

const props = defineProps({
  result:      { type: String, required: true },  // 'win' | 'lose' | 'clear' | 'gameover'
  battleCount: { type: Number, required: true },
  wins:        { type: Number, required: true },
  lives:       { type: Number, required: true },
  maxLives:    { type: Number, default: 3 },
  enemyName:   { type: String, default: '对手' },
  itemStats:   { type: Array,  default: () => [] }, // 来自 useBattle
  rewardItems: { type: Array,  default: () => [] }, // 即将发放的战利品
})
defineEmits(['next'])

const isWin     = computed(() => props.result === 'win' || props.result === 'clear')
const isEndGame = computed(() => props.result === 'clear' || props.result === 'gameover')

const livesText = computed(() =>
  '⚡'.repeat(props.lives) + '○'.repeat(Math.max(0, props.maxLives - props.lives))
)
const isFirstLoss = computed(() => props.result === 'lose' && props.lives === props.maxLives - 1)

// 按伤害降序排列
const sortedStats = computed(() =>
  [...props.itemStats].sort((a, b) => (b.damage + b.heal) - (a.damage + a.heal))
)

const totalDamage = computed(() => props.itemStats.reduce((s, i) => s + (i.damage || 0), 0))
const totalHeal   = computed(() => props.itemStats.reduce((s, i) => s + (i.heal || 0), 0))

function noContrib(s) {
  return !s.damage && !s.heal && !s.shield && !s.burn && !s.poison
}

function tierLabel(t) {
  return { Bronze: '铜', Silver: '银', Gold: '金', Diamond: '钻' }[t] || t
}
</script>

<style scoped>
.report-screen {
  display: flex; flex-direction: column;
  height: 100%; overflow-y: auto; overflow-x: hidden;
  background:
    linear-gradient(rgba(5,3,2,.85), rgba(5,3,2,.85)),
    url('/background/bg-victory.png') center / cover no-repeat;
}

/* ── 结果 Banner ── */
@keyframes banner-slide {
  0%  { opacity: 0; transform: translateY(-12px); }
  100%{ opacity: 1; transform: translateY(0); }
}
.result-banner {
  flex-shrink: 0;
  display: flex; align-items: center; gap: 10px;
  padding: 12px 14px;
  border-bottom: 2px solid var(--panel-border);
  animation: banner-slide .4s ease-out;
}
.banner-win  { background: linear-gradient(rgba(0,0,0,.55), rgba(0,0,0,.55)), url('/background/bg-victory.png') center/cover no-repeat; }
.banner-clear{ background: linear-gradient(rgba(0,0,0,.42), rgba(0,0,0,.42)), url('/background/bg-treasure-map.png') center/cover no-repeat; }
.banner-lose { background: linear-gradient(rgba(40,4,4,.72), rgba(26,4,4,.78)), url('/background/bg-victory.png') center/cover no-repeat; }

.result-icon  { font-size: 32px; flex-shrink: 0; }
.result-text  { display: flex; flex-direction: column; gap: 2px; flex: 1; }
.result-title { font-size: 18px; font-weight: bold; }
.banner-win  .result-title, .banner-clear .result-title { color: var(--gold); }
.banner-lose .result-title  { color: #e07050; }
.result-sub   { font-size: 11px; color: var(--text-dim); }
.result-progress { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.progress-wins   { font-size: 13px; font-weight: bold; color: var(--gold); }
.progress-lives  { font-size: 14px; }
.progress-hint   { font-size: 10px; color: #e07050; opacity: .85; }

/* ── 战绩列表 ── */
.stats-section { padding: 8px 10px; display: flex; flex-direction: column; gap: 6px; }
.stats-title   { font-size: 12px; font-weight: bold; color: var(--text-dim); letter-spacing: 1px; }

.stats-list    { display: flex; flex-direction: column; gap: 4px; }

.stat-row {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 8px; border-radius: 6px;
  background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.06);
}
.stat-icon { width: 32px; height: 32px; border-radius: 6px; object-fit: cover; flex-shrink: 0; }
.stat-name { display: flex; flex-direction: column; gap: 1px; flex: 1; min-width: 0; }
.stat-item-name { font-size: 12px; font-weight: bold; color: var(--text); }
.stat-tier { font-size: 10px; }
.tier-text-Bronze  { color: var(--bronze); }
.tier-text-Silver  { color: var(--silver); }
.tier-text-Gold    { color: var(--gold);   }
.tier-text-Diamond { color: var(--gem);    }

.stat-nums { display: flex; flex-wrap: wrap; gap: 4px; justify-content: flex-end; }
.stat-num  { font-size: 11px; font-weight: bold; padding: 1px 5px; border-radius: 4px; background: rgba(0,0,0,.3); white-space: nowrap; }
.dmg { color: #ff7050; }
.hel { color: #5ad070; }
.shd { color: var(--freeze); }
.brn { color: var(--burn); }
.psn { color: var(--poison); }
.none{ color: var(--text-dim); opacity: .5; }

/* 总计 */
.stats-total {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 8px; border-top: 1px solid var(--panel-border);
  font-size: 12px; color: var(--text-dim);
}
.total-dmg { font-weight: bold; color: #ff7050; margin-left: auto; }
.total-hel { font-weight: bold; color: #5ad070; }

.no-items { flex: 1; display: flex; align-items: center; justify-content: center; color: var(--text-dim); font-size: 13px; }

/* ── 战利品预览 ── */
.reward-preview { padding: 8px 10px; display: flex; flex-direction: column; gap: 6px; }
.reward-row { display: flex; gap: 8px; flex-wrap: wrap; }
.reward-thumb {
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  width: 52px; position: relative;
}
.reward-thumb-img {
  width: 52px; height: 52px; border-radius: 7px; object-fit: cover;
  border: 1px solid rgba(255,255,255,.1);
}
.reward-thumb-tier {
  position: absolute; top: -4px; right: -4px;
  font-size: 9px; font-weight: bold;
  padding: 1px 4px; border-radius: 6px;
}
.reward-thumb-name {
  font-size: 9px; color: var(--text-dim); text-align: center;
  max-width: 52px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

/* ── 按钮 ── */
.report-actions {
  margin-top: auto; flex-shrink: 0; padding: 8px 10px;
  border-top: 1px solid var(--panel-border);
  background: var(--panel);
}
.next-btn { width: 100%; padding: 12px; font-size: 15px; }
</style>
