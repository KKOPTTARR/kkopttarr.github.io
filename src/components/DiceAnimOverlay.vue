<template>
  <Teleport to="body">
    <div v-if="diceAnim.active" class="dice-anim-overlay" :class="diceAnim.result ? `dice-result-${diceAnim.result}` : ''">
      <div class="dice-anim-stage">
        <div class="dice-glow-ring" :class="diceAnim.result ? `dice-glow-${diceAnim.result}` : 'dice-glow-default'"></div>
        <div class="dice-emoji" :class="diceAnim.diceClass">{{ diceAnim.diceFace }}</div>
        <div class="dice-anim-card" :class="diceAnim.cardClass">
          <img :src="diceAnim.imgUrl" class="dice-anim-img" draggable="false" />
          <div class="dice-anim-tier-pill" :class="`merge-tier-${diceAnim.tier}`">
            {{ TIER_LABELS[diceAnim.tier] }}
          </div>
        </div>
      </div>
      <div v-if="diceAnim.label" class="dice-anim-label">{{ diceAnim.label }}</div>
    </div>
  </Teleport>
</template>

<script setup>
import { diceAnim } from '../composables/useDiceAnim.js'
import { TIER_LABELS } from '../data/tiers.js'
</script>
