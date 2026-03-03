<template>
  <div class="event-screen">
    <div class="event-body">
      <div class="event-title">⚓ 航行遭遇</div>
      <p class="event-subtitle">选择一项继续前行</p>

      <div class="event-choices">
        <button
          v-for="opt in options"
          :key="opt.id"
          class="event-choice"
          @click="$emit('choice', opt.id)"
        >
          <img v-if="opt.img" :src="opt.img" class="choice-icon-img" draggable="false" />
          <span v-else class="choice-icon">{{ opt.icon }}</span>
          <span class="choice-label">{{ opt.label }}</span>
          <span class="choice-desc">{{ opt.desc }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  options: { type: Array, default: () => [] },
})
defineEmits(['choice'])
</script>

<style scoped>
.event-screen {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 100%;
  background:
    linear-gradient(rgba(0,0,0,.52), rgba(0,0,0,.60)),
    url('/background/bg-sea-chart.png') center / cover no-repeat;
}

.event-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  gap: 20px;
}

.event-title {
  font-size: 26px;
  font-weight: 700;
  color: #e8c87a;
  text-shadow: 0 0 12px rgba(220,160,60,.5);
  letter-spacing: 1px;
}
.event-subtitle {
  color: #9e8060;
  font-size: 13px;
  margin: -12px 0 0;
}

.event-choices {
  display: flex;
  gap: 14px;
  width: 100%;
  max-width: 520px;
}

.event-choice {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 10px;
  background: linear-gradient(160deg, #2e1a08, #1e1008);
  border: 1px solid #6b4420;
  border-radius: 12px;
  color: #d4a060;
  cursor: pointer;
  transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
}
.event-choice:hover {
  transform: translateY(-3px);
  border-color: #c0832a;
  box-shadow: 0 6px 18px rgba(180,100,20,.35);
  color: #f0c060;
}
.event-choice:active { transform: translateY(0); }

.choice-icon     { font-size: 30px; }
.choice-icon-img {
  width: 72px; height: 72px;
  border-radius: 10px; object-fit: cover;
  border: 1px solid rgba(255,255,255,.12);
}
.choice-label { font-size: 15px; font-weight: 700; }
.choice-desc  { font-size: 11px; color: #9e8060; text-align: center; line-height: 1.4; }
</style>
