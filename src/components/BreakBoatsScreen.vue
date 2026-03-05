<template>
  <div class="break-boats-screen">
    <PanelStatus :lives="lives" :max-lives="maxLives" :battle-count="battleCount" />
    <div class="bb-header">
      <span class="bb-title">💪 破釜沉舟</span>
      <button class="bb-skip-btn" @click="$emit('skip')">跳过</button>
    </div>

    <div class="bb-body">
      <div class="bb-cost-box">
        <div class="bb-cost-label">代价</div>
        <div class="bb-cost-value">失去 <span class="hp-num">{{ hpLoss }}</span> 点生命</div>
        <div class="bb-cost-sub">当前 {{ lives }} / {{ maxLives }}</div>
      </div>

      <div class="bb-arrow">→</div>

      <div class="bb-gain-box">
        <div class="bb-gain-label">收益</div>
        <div class="bb-gain-value">阵容全部物品</div>
        <div class="bb-gain-sub">各获得随机特效</div>
      </div>
    </div>

    <div class="bb-items">
      <div v-if="playerItems.length === 0" class="bb-empty">阵容中没有物品</div>
      <template v-else>
        <div class="bb-items-label">将影响的物品（{{ playerItems.length }} 件）</div>
        <div class="bb-items-grid">
          <div
            v-for="item in playerItems"
            :key="item.instanceId"
            class="bb-item-chip"
            :class="`tier-${item.tier.toLowerCase()}`"
          >
            <img :src="getIconUrl(item.name_en, item.tier)" class="chip-img" draggable="false" />
            <span class="chip-name">{{ item.name_cn }}</span>
          </div>
        </div>
      </template>
    </div>

    <div class="bb-footer">
      <button
        class="btn btn-primary confirm-btn"
        :disabled="playerItems.length === 0"
        @click="$emit('confirm')"
      >
        确认破釜沉舟
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getIconUrl } from '../data/items.js'
import PanelStatus from './PanelStatus.vue'

const props = defineProps({
  playerItems: { type: Array,  default: () => [] },
  lives:       Number,
  maxLives:    Number,
  battleCount: Number,
})

defineEmits(['confirm', 'skip'])

const hpLoss = computed(() => Math.max(1, Math.ceil(props.maxLives * 0.2)))
</script>

<style scoped>
.break-boats-screen {
  position: fixed; top: 0; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 600px; z-index: 200;
  display: flex; flex-direction: column;
  background:
    linear-gradient(rgba(18,4,4,.90), rgba(18,4,4,.90)),
    url('/background/bg-sea-chart.png') center / cover no-repeat;
}

.bb-header {
  flex-shrink: 0; display: flex; justify-content: space-between; align-items: center;
  padding: 14px 14px 10px;
  border-bottom: 1px solid var(--panel-border);
}
.bb-title { font-size: 16px; font-weight: bold; color: #e07040; }
.bb-skip-btn {
  padding: 6px 14px; border-radius: 6px; font-size: 12px;
  background: var(--panel); border: 1px solid var(--panel-border);
  color: var(--text-dim); cursor: pointer; font-family: inherit;
}
.bb-skip-btn:hover { border-color: #e07040; color: #e07040; }

/* ── 代价/收益对比 ── */
.bb-body {
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  gap: 16px;
  padding: 28px 20px 20px;
}
.bb-cost-box, .bb-gain-box {
  flex: 1; max-width: 180px;
  border-radius: 12px; padding: 16px 12px;
  text-align: center; display: flex; flex-direction: column; gap: 4px;
}
.bb-cost-box {
  background: rgba(200,40,20,.10);
  border: 1px solid rgba(200,60,20,.30);
}
.bb-gain-box {
  background: rgba(40,160,80,.10);
  border: 1px solid rgba(60,180,80,.30);
}
.bb-cost-label { font-size: 11px; color: rgba(220,80,40,.7); letter-spacing: 1px; }
.bb-gain-label { font-size: 11px; color: rgba(80,200,100,.7); letter-spacing: 1px; }
.bb-cost-value { font-size: 14px; font-weight: bold; color: #e07060; }
.bb-gain-value { font-size: 14px; font-weight: bold; color: #60e090; }
.hp-num { font-size: 20px; color: #ff5040; }
.bb-cost-sub, .bb-gain-sub { font-size: 11px; color: var(--text-dim); }

.bb-arrow { font-size: 22px; color: var(--text-dim); flex-shrink: 0; }

/* ── 物品列表 ── */
.bb-items {
  flex: 1; overflow-y: auto; padding: 0 16px 12px;
}
.bb-items-label {
  font-size: 11px; color: var(--text-dim); letter-spacing: 1px;
  text-align: center; padding: 8px 0;
}
.bb-items-grid {
  display: flex; flex-wrap: wrap; gap: 8px; justify-content: center;
}
.bb-item-chip {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 10px; border-radius: 20px;
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.10);
}
.bb-item-chip.tier-bronze  { border-color: rgba(180,110,20,.4); }
.bb-item-chip.tier-silver  { border-color: rgba(160,160,200,.35); }
.bb-item-chip.tier-gold    { border-color: rgba(212,168,32,.45); }
.bb-item-chip.tier-diamond { border-color: rgba(60,180,255,.4); }
.chip-img  { width: 28px; height: 28px; border-radius: 6px; object-fit: cover; }
.chip-name { font-size: 11px; color: var(--text); }
.bb-empty { color: var(--text-dim); font-size: 13px; text-align: center; padding: 32px 0; opacity: .6; }

/* ── 底部按钮 ── */
.bb-footer {
  flex-shrink: 0; padding: 10px 14px;
  border-top: 1px solid var(--panel-border);
  background: var(--panel);
}
.confirm-btn { width: 100%; padding: 12px; font-size: 15px; }
</style>
