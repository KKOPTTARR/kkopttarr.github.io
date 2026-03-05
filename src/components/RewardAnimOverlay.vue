<template>
  <Teleport to="body">
    <div v-if="rewardAnim.active" class="battle-result-overlay">

      <!-- 胜负 Banner -->
      <div v-if="rewardAnim.result !== null" class="result-banner" :class="rewardAnim.result === 'win' ? 'banner-win' : 'banner-lose'">
        <span class="result-icon">{{ rewardAnim.result === 'win' ? '⚔️' : '💀' }}</span>
        <span class="result-text">{{ rewardAnim.result === 'win' ? '胜利！' : '失败...' }}</span>
        <span v-if="rewardAnim.result === 'lose'" class="lives-text">
          士气 {{ '⚡'.repeat(rewardAnim.livesLeft) }}{{ '○'.repeat(Math.max(0, 3 - rewardAnim.livesLeft)) }}
        </span>
      </div>

      <!-- 战利品标题 -->
      <div class="reward-title">
        {{ rewardAnim.isConsolation ? '🎁 安慰奖励' : '🎁 战利品' }}
      </div>

      <!-- 奖励物品 -->
      <div class="reward-cards">
        <div
          v-for="(item, i) in rewardAnim.items"
          :key="i"
          class="reward-card"
          :class="rewardAnim.phase === 'fly' ? 'rw-fly' : 'rw-show'"
          :style="rewardAnim.phase === 'fly' ? { animationDelay: `${i * 150}ms` } : { animationDelay: `${i * 120}ms` }"
        >
          <img :src="getIconUrl(item.name_en, item.tier)" class="reward-img" draggable="false" />
          <div class="reward-tier" :class="`merge-tier-${item.tier}`">{{ TIER_LABELS[item.tier] }}</div>
          <div class="reward-name">{{ item.name_cn }}</div>
        </div>
      </div>

    </div>
  </Teleport>
</template>

<script setup>
import { rewardAnim } from '../composables/useRewards.js'
import { getIconUrl } from '../data/items.js'
import { TIER_LABELS } from '../data/tiers.js'
</script>
