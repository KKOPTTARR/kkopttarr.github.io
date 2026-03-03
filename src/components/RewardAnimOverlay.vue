<template>
  <Teleport to="body">
    <div v-if="rewardAnim.active" class="reward-anim-overlay">
      <div class="reward-anim-title">{{ rewardAnim.items.length === 1 ? '🎁 安慰奖励' : '🎁 战利品' }}</div>
      <div class="reward-anim-cards">
        <div
          v-for="(item, i) in rewardAnim.items"
          :key="i"
          class="reward-anim-card"
          :class="rewardAnim.phase === 'fly' ? 'rw-fly' : 'rw-show'"
          :style="rewardAnim.phase === 'fly' ? { animationDelay: `${i * 150}ms` } : {}"
        >
          <img :src="getIconUrl(item.name_en, item.tier)" class="reward-anim-img" draggable="false" />
          <div class="reward-anim-tier" :class="`merge-tier-${item.tier}`">
            {{ TIER_LABELS[item.tier] }}
          </div>
          <div class="reward-anim-name">{{ item.name_cn }}</div>
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
