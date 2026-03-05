<template>
  <div class="skill-select-screen">
    <div class="ss-header">
      <div class="ss-chapter">第 {{ chapterNumber }} 章 · {{ chapterName }} 通过！</div>
      <div class="ss-title">选择一个被动技能</div>
    </div>

    <div class="skills-area">
      <div
        v-for="skill in candidates"
        :key="skill.id"
        class="skill-card"
        :class="`tier-border-${skill.tier}`"
        @click="$emit('select', skill)"
      >
        <div class="skill-icon">{{ skill.icon }}</div>
        <div class="skill-tier" :class="`tier-text-${skill.tier}`">{{ TIER_LABELS[skill.tier] }}</div>
        <div class="skill-name">{{ skill.name_cn }}</div>
        <div class="skill-desc">{{ formatDesc(skill) }}</div>
        <div class="skill-level-badge" :class="`level-${skill.level}`">{{ LEVEL_LABELS[skill.level] }}</div>
      </div>
    </div>

    <div class="ss-hint">该技能将在之后每场战斗中永久生效</div>
  </div>
</template>

<script setup>
import { TIER_LABELS } from '../data/tiers.js'

const props = defineProps({
  candidates:    { type: Array,  default: () => [] },
  chapterNumber: { type: Number, default: 1 },
  chapterName:   { type: String, default: '' },
})

defineEmits(['select'])

const LEVEL_LABELS = { basic: '基础', intermediate: '中级', advanced: '高级' }

function formatDesc(skill) {
  const val = skill.tiers?.[skill.tier]?.value ?? 0
  return skill.desc_cn.replace('{value}', val)
}
</script>

<style scoped>
.skill-select-screen {
  flex: 1; display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 24px; padding: 24px 16px;
  background:
    linear-gradient(rgba(4,6,18,.78), rgba(4,6,18,.78)),
    url('/background/bg-sea-chart.png') center / cover no-repeat;
}
.ss-header { text-align: center; }
.ss-chapter {
  font-size: 13px; color: var(--gold); letter-spacing: 1px;
  margin-bottom: 6px; opacity: .85;
}
.ss-title { font-size: 20px; font-weight: bold; color: var(--text); }

.skills-area {
  display: flex; gap: 16px; width: 100%; justify-content: center;
}
.skill-card {
  flex: 1; max-width: 48%; min-height: 220px;
  border-radius: 16px; border: 2px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.04);
  display: flex; flex-direction: column; align-items: center;
  gap: 10px; padding: 20px 14px; cursor: pointer;
  transition: border-color .18s, background .18s, transform .18s;
  position: relative;
}
.skill-card:hover {
  transform: translateY(-6px);
  background: rgba(255,255,255,.09);
}
.skill-icon { font-size: 40px; line-height: 1; }
.skill-tier { font-size: 12px; font-weight: bold; letter-spacing: 1px; }
.skill-name { font-size: 15px; font-weight: bold; color: var(--text); text-align: center; }
.skill-desc { font-size: 11px; color: var(--text-dim); text-align: center; line-height: 1.6; flex: 1; }

.skill-level-badge {
  position: absolute; top: 10px; right: 10px;
  font-size: 9px; padding: 2px 6px; border-radius: 4px; font-weight: bold;
  letter-spacing: .5px;
}
.level-basic        { background: rgba(100,140,100,.3); color: #80c880; }
.level-intermediate { background: rgba(100,120,180,.3); color: #80a0e0; }
.level-advanced     { background: rgba(160,80,160,.3);  color: #c080c0; }

.ss-hint { font-size: 11px; color: var(--text-dim); opacity: .6; }

.tier-border-Bronze  { border-color: var(--bronze); box-shadow: 0 0  8px rgba(205,127, 50,.35); }
.tier-border-Silver  { border-color: var(--silver); box-shadow: 0 0  8px rgba(184,168,144,.35); }
.tier-border-Gold    { border-color: var(--gold);   box-shadow: 0 0 12px rgba(255,215,  0,.45); }
.tier-border-Diamond { border-color: var(--gem);    box-shadow: 0 0 16px rgba(126,200,227,.55); }
.tier-text-Bronze  { color: var(--bronze); font-size: 13px; font-weight: 900; letter-spacing: 1.5px; }
.tier-text-Silver  { color: var(--silver); font-size: 13px; font-weight: 900; letter-spacing: 1.5px; }
.tier-text-Gold    { color: var(--gold);   font-size: 13px; font-weight: 900; letter-spacing: 1.5px; }
.tier-text-Diamond { color: var(--gem);    font-size: 13px; font-weight: 900; letter-spacing: 1.5px; }
</style>
