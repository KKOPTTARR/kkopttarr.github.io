<template>
  <Teleport to="body">
    <div v-if="battleFlash" class="battle-flash-overlay">
      <div class="flash-swords">⚔️</div>
      <div class="flash-shockwave"></div>
    </div>
  </Teleport>
</template>

<script setup>
import { battleFlash } from '../composables/useBattleFlow.js'
</script>
