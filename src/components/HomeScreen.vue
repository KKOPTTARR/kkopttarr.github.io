<template>
  <div class="home-screen">
    <div class="home-deco">☠️</div>
    <h1 class="home-title">小扎巴</h1>
    <p class="home-sub">海盗贸易·卡牌自战</p>
    <button class="btn btn-primary home-btn" @click="$emit('start')">开始游戏</button>
  </div>
</template>

<script setup>
defineEmits(['start'])
</script>

<style scoped>
.home-screen {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 16px;
  background:
    radial-gradient(ellipse at 50% 40%, rgba(8,5,2,.28) 0%, rgba(8,5,2,.75) 100%),
    url('/background/bg-clear.png') center 20% / cover no-repeat;
}
.home-deco {
  font-size: 64px;
  filter: drop-shadow(0 0 24px rgba(200,134,10,.6));
  animation: deco-float 3s ease-in-out infinite;
}
@keyframes deco-float {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-8px); }
}
.home-title {
  font-size: 42px; font-weight: 900; letter-spacing: 6px;
  color: var(--gold);
  text-shadow: 0 0 20px rgba(200,134,10,.6), 0 2px 8px rgba(0,0,0,.8);
}
.home-sub {
  font-size: 13px; color: var(--text-dim); letter-spacing: 3px;
}
.home-btn {
  margin-top: 12px; padding: 12px 48px; font-size: 16px;
  letter-spacing: 4px; border-radius: 8px;
}
</style>
