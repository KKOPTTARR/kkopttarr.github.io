<template>
  <Teleport to="body">
    <div v-if="diceAnim.active" class="dice-anim-overlay" :class="diceAnim.result ? `dice-result-${diceAnim.result}` : ''">
      <div class="dice-anim-stage">
        <div class="dice-glow-ring" :class="diceAnim.result ? `dice-glow-${diceAnim.result}` : 'dice-glow-idle'"></div>

        <!-- 骰子主体 -->
        <div class="dice-body" :class="[diceAnim.diceClass, diceAnim.result ? `dice-body-${diceAnim.result}` : '']">
          <span class="dice-emoji-inner">{{ diceAnim.diceFace }}</span>
        </div>

        <!-- 落定后显示的点数徽章 -->
        <Transition name="face-pop">
          <div v-if="diceAnim.faceValue" class="dice-face-badge" :class="`face-badge-${diceAnim.result || 'idle'}`">
            {{ diceAnim.faceValue }}
          </div>
        </Transition>
      </div>

      <!-- 结果文字 -->
      <Transition name="label-rise">
        <div v-if="diceAnim.label" class="dice-anim-label" :class="`dice-label-${diceAnim.result}`">
          {{ diceAnim.label }}
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<script setup>
import { diceAnim } from '../composables/useDiceAnim.js'
</script>
