<template>
  <div class="upgrade-screen">
    <PanelStatus :lives="lives" :max-lives="maxLives" :battle-count="battleCount" />
    <div class="upgrade-header">
      <span class="upgrade-title">⬆️ 升级「{{ tag }}」类物品</span>
      <button class="upgrade-skip-btn" @click="$emit('skip')">跳过</button>
    </div>
    <div class="upgrade-list">
      <div
        v-for="item in items"
        :key="item.instanceId"
        class="upgrade-item-row"
        @click="$emit('upgrade', item)"
      >
        <img :src="getIconUrl(item.name_en, item.tier)" class="upgrade-item-img" draggable="false" />
        <div class="upgrade-item-body">
          <div class="upgrade-item-name">{{ item.name_cn }}</div>
          <div class="upgrade-tier-line">
            <span :class="`tier-text-${item.tier}`">{{ TIER_LABELS[item.tier] }}</span>
            <span class="upgrade-arrow"> → </span>
            <span :class="`tier-text-${nextTierOf(item.tier)}`">{{ nextTierLabel(nextTierOf(item.tier)) }}</span>
          </div>
          <div class="upgrade-preview">{{ upgradePreview(item) }}</div>
        </div>
      </div>
      <div v-if="items.length === 0" class="upgrade-empty">
        暂无可升级的「{{ tag }}」类物品
      </div>
    </div>
  </div>
</template>

<script setup>
import { getIconUrl, findItem } from '../data/items.js'
import { TIER_LABELS, nextTierOf, nextTierLabel } from '../data/tiers.js'
import PanelStatus from './PanelStatus.vue'

const props = defineProps({
  items:      { type: Array,  default: () => [] },
  lives:      Number,
  maxLives:   Number,
  battleCount:Number,
  tag:        String,
})

defineEmits(['upgrade', 'skip'])


function upgradePreview(inst) {
  const base = findItem(inst.id)
  const nextTier = nextTierOf(inst.tier)
  if (!base || nextTier === inst.tier) return ''
  const next = base.tiers?.[nextTier]
  if (!next) return ''
  const parts = []
  if (next.damage  !== inst.damage)  parts.push(`⚔️${inst.damage}→${next.damage}`)
  if (next.heal    !== inst.heal)    parts.push(`💚${inst.heal}→${next.heal}`)
  if (next.shield  !== inst.shield)  parts.push(`🛡${inst.shield}→${next.shield}`)
  if (next.burn    !== inst.burn)    parts.push(`🔥${inst.burn}→${next.burn}`)
  if (next.poison  !== inst.poison)  parts.push(`☠${inst.poison}→${next.poison}`)
  return parts.join('  ') || '属性提升'
}
</script>

<style scoped>
.upgrade-screen {
  position: fixed; top: 0; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 600px; z-index: 200;
  display: flex; flex-direction: column;
  background:
    linear-gradient(rgba(4,8,18,.72), rgba(4,8,18,.72)),
    url('/background/bg-sea-chart.png') center / cover no-repeat;
}
.upgrade-header {
  flex-shrink: 0; display: flex; justify-content: space-between; align-items: center;
  padding: 14px 14px 10px;
  border-bottom: 1px solid var(--panel-border);
}
.upgrade-title { font-size: 16px; font-weight: bold; color: var(--gold); }
.upgrade-skip-btn {
  padding: 6px 14px; border-radius: 6px; font-size: 12px;
  background: var(--panel); border: 1px solid var(--panel-border);
  color: var(--text-dim); cursor: pointer; font-family: inherit;
}
.upgrade-skip-btn:hover { border-color: var(--gold); color: var(--gold); }
.upgrade-list {
  flex: 1; overflow-y: auto; padding: 10px 12px;
  display: flex; flex-direction: column; gap: 8px;
}
.upgrade-item-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: 10px; cursor: pointer;
  background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08);
  transition: border-color .14s, background .14s;
}
.upgrade-item-row:hover {
  border-color: var(--gold); background: rgba(200,134,10,.08);
}
.upgrade-item-img { width: 44px; height: 44px; border-radius: 8px; object-fit: cover; flex-shrink: 0; }
.upgrade-item-body { flex: 1; display: flex; flex-direction: column; gap: 3px; }
.upgrade-item-name { font-size: 13px; font-weight: bold; color: var(--text); }
.upgrade-tier-line { font-size: 11px; display: flex; align-items: center; gap: 3px; }
.upgrade-arrow { color: var(--text-dim); }
.upgrade-preview { font-size: 11px; color: var(--text-dim); }
.upgrade-empty { color: var(--text-dim); font-size: 13px; text-align: center; padding: 32px 0; opacity: .6; }
.tier-text-Bronze  { color: var(--bronze); }
.tier-text-Silver  { color: var(--silver); }
.tier-text-Gold    { color: var(--gold);   }
.tier-text-Diamond { color: var(--gem);    }
</style>
