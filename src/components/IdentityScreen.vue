<template>
  <div class="identity-screen">
    <div class="identity-header">
      <div class="identity-title">⚓ 选择你的身份</div>
      <div class="identity-sub">不同的出身，不同的命运</div>
    </div>

    <div class="identity-cards">
      <div
        v-for="identity in IDENTITY_POOL"
        :key="identity.id"
        class="identity-card"
        @click="$emit('choose', identity.id)"
      >
        <img class="card-portrait" :src="`${baseUrl}${identity.portrait}`" :alt="identity.name" draggable="false" />
        <div class="card-name">{{ identity.name }}</div>
        <div class="card-flavor">{{ identity.flavor }}</div>
        <div class="card-divider"></div>
        <div class="card-items-label">初始物品</div>
        <div class="card-items">
          <span v-for="item in identity.itemNames" :key="item" class="card-item-tag">{{ item }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { IDENTITY_POOL } from '../data/config.js'

const baseUrl = import.meta.env.BASE_URL

defineEmits(['choose'])
</script>

<style scoped>
.identity-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 100%;
  /* 边缘加深（画框感），中央透亮（让 4 个船员头像透出来衬托） */
  background:
    linear-gradient(180deg,
      rgba(0,0,0,.72) 0%,
      rgba(0,0,0,.38) 18%,
      rgba(0,0,0,.32) 80%,
      rgba(0,0,0,.65) 100%),
    url('/background/bg-clear.png') center 40% / cover no-repeat;
  padding: 24px 16px;
  gap: 24px;
}

.identity-header {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: rgba(6,4,1,.70);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  padding: 10px 24px;
  border-radius: 12px;
  border: 1px solid rgba(180,100,30,.25);
}
.identity-title {
  font-size: 26px;
  font-weight: 700;
  color: #e8c87a;
  text-shadow: 0 0 12px rgba(220,160,60,.5);
  letter-spacing: 1px;
}
.identity-sub {
  font-size: 13px;
  color: #9e8060;
}

/* ── 卡片组 ── */
.identity-cards {
  display: flex;
  gap: 12px;
  width: 100%;
  max-width: 700px;
  align-items: stretch;
}

.identity-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 8px 8px 16px;
  overflow: hidden;
  background: linear-gradient(160deg, rgba(46,26,8,.82), rgba(30,16,8,.88));
  border: 1px solid rgba(160,90,30,.55);
  border-radius: 14px;
  cursor: pointer;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  box-shadow: 0 4px 16px rgba(0,0,0,.5), inset 0 1px 0 rgba(200,130,40,.10);
  transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
  text-align: center;
}
.identity-card:hover {
  transform: translateY(-4px);
  border-color: #d4922a;
  box-shadow: 0 8px 24px rgba(180,100,20,.4);
}
.identity-card:active { transform: translateY(0); }

.card-portrait {
  width: 100%;
  aspect-ratio: 200 / 270;
  object-fit: cover;
  border-radius: 8px;
  margin-bottom: 2px;
}
.card-name   { font-size: 17px; font-weight: 700; color: #f0c060; }
.card-flavor { font-size: 11px; color: #9e8060; line-height: 1.5; min-height: 32px; }

.card-divider {
  width: 60%;
  height: 1px;
  background: rgba(200,140,40,.2);
  margin: 2px 0;
}

.card-items-label {
  font-size: 10px;
  color: #7a6040;
  letter-spacing: 1px;
  text-transform: uppercase;
}
.card-items {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: center;
}
.card-item-tag {
  font-size: 11px;
  padding: 2px 8px;
  background: rgba(200,140,40,.15);
  border: 1px solid rgba(200,140,40,.3);
  border-radius: 10px;
  color: #d4a060;
}
</style>
