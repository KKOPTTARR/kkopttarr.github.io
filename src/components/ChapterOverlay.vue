<template>
  <Teleport to="body">
    <Transition name="chapter-fade">
      <div v-if="visible" class="chapter-overlay">
        <div class="chapter-content">
          <div class="chapter-num">第 {{ chapterNum }} 章</div>
          <div class="chapter-name">{{ chapterName }}</div>
          <div class="chapter-divider"></div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
const props = defineProps({
  visible:     Boolean,
  chapterNum:  Number,
  chapterName: String,
})
</script>

<style scoped>
.chapter-overlay {
  position: fixed; inset: 0; z-index: 999;
  display: flex; align-items: center; justify-content: center;
  background: rgba(2, 5, 14, 0.92);
  backdrop-filter: blur(4px);
}
.chapter-content {
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  text-align: center; padding: 40px 32px;
}
.chapter-num {
  font-size: 13px; letter-spacing: 4px; color: var(--gold);
  opacity: .7; text-transform: uppercase;
}
.chapter-name {
  font-size: 36px; font-weight: bold; color: var(--text);
  letter-spacing: 6px;
  text-shadow: 0 0 40px rgba(200,160,60,.4);
}
.chapter-divider {
  width: 60px; height: 1px;
  background: linear-gradient(90deg, transparent, var(--gold), transparent);
  margin: 4px 0;
}

.chapter-fade-enter-active { transition: opacity .5s ease; }
.chapter-fade-leave-active  { transition: opacity .6s ease .8s; }
.chapter-fade-enter-from,
.chapter-fade-leave-to      { opacity: 0; }
</style>
