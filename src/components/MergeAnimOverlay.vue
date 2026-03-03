<template>
  <Teleport to="body">
    <div v-if="mergeAnim.active" class="merge-anim-overlay">
      <div class="merge-anim-stage">
        <div class="merge-glow-ring" :class="`merge-glow-${mergeAnim.tier}`"></div>
        <div class="merge-anim-card" :class="mergeAnim.cardClass">
          <img :src="mergeAnim.imgUrl" class="merge-anim-img" draggable="false" />
          <div class="merge-anim-tier-pill" :class="`merge-tier-${mergeAnim.tier}`">
            {{ TIER_LABELS[mergeAnim.tier] }}
          </div>
        </div>
      </div>
      <div v-if="mergeAnim.label" class="merge-anim-label">{{ mergeAnim.label }}</div>
    </div>
  </Teleport>
</template>

<script setup>
import { mergeAnim } from '../composables/useMergeAnim.js'
import { TIER_LABELS } from '../data/tiers.js'
</script>
