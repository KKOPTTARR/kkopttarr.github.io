<template>
  <Transition name="panel">
    <div v-if="item" class="idp-wrap">
      <div class="idp-backdrop" @click="$emit('close')" />
      <div class="idp-panel">
        <button class="idp-close" @click="$emit('close')">✕</button>

        <img
          class="idp-icon"
          :src="getIconUrl(item.name_en, item.tier)"
          :alt="item.name_cn"
          @error="onImgError"
        />

        <div class="idp-tier-pill" :class="`merge-tier-${item.tier}`">
          {{ TIER_LABELS[item.tier] ?? item.tier }}
        </div>

        <div class="idp-name">{{ item.name_cn }}</div>

        <div v-if="item.tags?.length" class="idp-tags">{{ item.tags.join(' · ') }}</div>

        <div class="idp-stats">
          <div v-if="item.damage"  class="idp-stat-row"><span>⚔️</span><span>{{ item.damage }}</span></div>
          <div v-if="item.heal"    class="idp-stat-row"><span>💚</span><span>{{ item.heal }}</span></div>
          <div v-if="item.shield"  class="idp-stat-row"><span>🛡</span><span>{{ item.shield }}</span></div>
          <div v-if="item.burn"    class="idp-stat-row"><span>🔥</span><span>{{ item.burn }}</span></div>
          <div v-if="item.poison"  class="idp-stat-row"><span>☠</span><span>{{ item.poison }}</span></div>
          <div class="idp-stat-row"><span>⏱</span><span>{{ ((item._cooldown ?? item.cooldown) / 1000).toFixed(1) }}s</span></div>
        </div>

        <div v-if="item.skill_cn" class="idp-divider" />
        <div v-if="item.skill_cn" class="idp-skill">{{ item.skill_cn }}</div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { getIconUrl } from '../data/items.js'
import { TIER_LABELS } from '../data/tiers.js'

defineProps({ item: Object })
defineEmits(['close'])

function onImgError(e) {
  e.target.style.display = 'none'
}
</script>

<style scoped>
.idp-wrap {
  position: absolute;
  inset: 0;
  z-index: 5000;
  pointer-events: none;
}

.idp-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  pointer-events: auto;
}

.idp-panel {
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  width: 220px;
  background: #1a1008;
  border-left: 1px solid var(--panel-border);
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.7);
  padding: 16px 14px;
  overflow-y: auto;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.idp-close {
  align-self: flex-end;
  background: none;
  border: none;
  color: var(--text-dim);
  font-size: 16px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  margin-bottom: 4px;
}
.idp-close:hover { color: var(--gold); }

.idp-icon {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--panel-border);
}

.idp-tier-pill {
  font-size: 11px;
  font-weight: 900;
  padding: 2px 10px;
  border-radius: 20px;
  border: 1px solid;
}

.idp-name {
  font-size: 15px;
  font-weight: bold;
  color: var(--gold);
  text-align: center;
}

.idp-tags {
  font-size: 11px;
  color: var(--text-dim);
  text-align: center;
}

.idp-stats {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-top: 4px;
}

.idp-stat-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #d4b87c;
  padding: 3px 6px;
  background: rgba(255,255,255,0.04);
  border-radius: 4px;
}

.idp-divider {
  width: 100%;
  height: 1px;
  background: var(--panel-border);
  margin: 2px 0;
}

.idp-skill {
  font-size: 11px;
  color: var(--text-dim);
  font-style: italic;
  line-height: 1.6;
  width: 100%;
}

/* 滑入动画 */
.panel-enter-active,
.panel-leave-active {
  transition: opacity 0.2s ease;
}
.panel-enter-active .idp-panel,
.panel-leave-active .idp-panel {
  transition: transform 0.2s ease;
}
.panel-enter-from,
.panel-leave-to {
  opacity: 0;
}
.panel-enter-from .idp-panel,
.panel-leave-to .idp-panel {
  transform: translateX(100%);
}
</style>
