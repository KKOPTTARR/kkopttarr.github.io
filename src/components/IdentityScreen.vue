<template>
  <div
    class="identity-screen"
    @touchstart.passive="onTouchStart"
    @touchend.passive="onTouchEnd"
  >
    <!-- Header -->
    <div class="identity-header">
      <div class="identity-title">⚓ 接受馈赠</div>
    </div>

    <!-- Card stage -->
    <div class="card-stage">
      <button class="nav-btn nav-left" @click="prev">《</button>

      <Transition :name="slideDir" mode="out-in">
        <div :key="currentIndex" class="identity-card">
          <img
            class="card-portrait"
            :src="`${baseUrl}${current.portrait}`"
            :alt="current.name"
            draggable="false"
          />
          <div class="card-info">
            <div class="card-name">{{ current.name }}</div>
            <div class="card-flavor">{{ current.flavor }}</div>

            <!-- Item icons row (Direction B) -->
            <div class="card-items">
              <!-- Fixed item icon -->
              <div class="item-slot" v-if="fixedItem">
                <img
                  class="item-slot-img"
                  :src="fixedIconUrl"
                  :alt="fixedItem.name_cn"
                />
                <span class="item-slot-name">{{ fixedItem.name_cn }}</span>
              </div>
              <!-- 2 random slots -->
              <div v-for="i in 2" :key="i" class="item-slot slot-random">
                <span class="slot-q">?</span>
                <span class="item-slot-name">随机{{ current.startTag }}</span>
              </div>
            </div>

            <!-- Skill toggle -->
            <div class="skill-row">
              <button
                class="skill-icon-btn"
                :class="{ open: skillOpen }"
                @click.stop="skillOpen = !skillOpen"
              >
                <span class="skill-emoji">{{ current.icon }}</span>
                <span class="skill-label">技能</span>
              </button>
              <Transition name="skill-fade">
                <div v-if="skillOpen" class="skill-desc">{{ currentSkillDesc }}</div>
              </Transition>
            </div>
          </div>
        </div>
      </Transition>

      <button class="nav-btn nav-right" @click="next">》</button>
    </div>

    <!-- Pagination dots -->
    <div class="dots">
      <span
        v-for="(_, i) in IDENTITY_POOL"
        :key="i"
        class="dot"
        :class="{ active: i === currentIndex }"
        @click="goTo(i)"
      ></span>
    </div>

    <!-- Confirm button -->
    <button class="choose-btn" @click="$emit('choose', current.id)">
      选择此馈赠
    </button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { IDENTITY_POOL } from '../data/config.js'
import { findItem, getIconUrl } from '../data/items.js'
import { SKILL_POOL } from '../composables/useSkills.js'

const baseUrl = import.meta.env.BASE_URL
defineEmits(['choose'])

const currentIndex = ref(0)
const skillOpen    = ref(false)
const slideDir     = ref('slide-left')

const current = computed(() => IDENTITY_POOL[currentIndex.value])

const currentSkillDesc = computed(() => {
  const id = current.value.skillId
  const tier = current.value.skillTier ?? 'Bronze'
  const base = SKILL_POOL.find(s => s.id === id)
  if (!base) return ''
  const val = base.tiers?.[tier]?.value ?? ''
  return base.desc_cn.replace('{value}', val)
})

const fixedItem = computed(() => {
  const id = current.value.startItems?.[0]
  return id != null ? findItem(id) : null
})

const fixedIconUrl = computed(() =>
  fixedItem.value ? getIconUrl(fixedItem.value.name_en, fixedItem.value.tier) : ''
)

function goTo(i) {
  slideDir.value = i > currentIndex.value ? 'slide-left' : 'slide-right'
  currentIndex.value = i
  skillOpen.value = false
}

function prev() {
  const i = (currentIndex.value - 1 + IDENTITY_POOL.length) % IDENTITY_POOL.length
  goTo(i)
}

function next() {
  const i = (currentIndex.value + 1) % IDENTITY_POOL.length
  goTo(i)
}

// Touch swipe
let touchStartX = 0
function onTouchStart(e) { touchStartX = e.touches[0].clientX }
function onTouchEnd(e) {
  const dx = e.changedTouches[0].clientX - touchStartX
  if (dx < -50) next()
  else if (dx > 50) prev()
}
</script>

<style scoped>
.identity-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 100%;
  background:
    linear-gradient(180deg,
      rgba(0,0,0,.72) 0%,
      rgba(0,0,0,.38) 18%,
      rgba(0,0,0,.32) 80%,
      rgba(0,0,0,.65) 100%),
    url('/background/bg-clear.png') center 40% / cover no-repeat;
  padding: 20px 12px 24px;
  gap: 16px;
  user-select: none;
}

/* ── Header ── */
.identity-header {
  text-align: center;
}
.identity-title {
  font-size: 22px;
  font-weight: 700;
  color: #e8c87a;
  text-shadow: 0 0 12px rgba(220,160,60,.5);
  letter-spacing: 1px;
}

/* ── Stage with nav arrows ── */
.card-stage {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  max-width: 360px;
}

.nav-btn {
  flex-shrink: 0;
  width: 40px;
  height: 52px;
  border: none;
  background: none;
  color: #c8882a;
  font-size: 44px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  text-shadow: 0 2px 8px rgba(0,0,0,.8), 0 0 12px rgba(180,100,10,.4);
  animation: btn-shimmer 3.5s ease-in-out infinite;
  transition: transform 0.15s, color 0.15s, text-shadow 0.15s;
}
.nav-btn:hover {
  animation: none;
  transform: scale(1.15);
  color: #f0b840;
  text-shadow: 0 2px 10px rgba(0,0,0,.9), 0 0 22px rgba(220,150,20,.7);
}
.nav-btn:active { transform: scale(0.9); }

@keyframes btn-shimmer {
  0%, 60%, 100% {
    color: #c8882a;
    text-shadow: 0 2px 8px rgba(0,0,0,.8), 0 0 12px rgba(180,100,10,.4);
  }
  75% {
    color: #ffe090;
    text-shadow: 0 2px 8px rgba(0,0,0,.7), 0 0 18px rgba(240,180,40,.8), 0 0 32px rgba(220,140,20,.5);
  }
  90% {
    color: #c8882a;
    text-shadow: 0 2px 8px rgba(0,0,0,.8), 0 0 12px rgba(180,100,10,.4);
  }
}

/* ── Card ── */
.identity-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: linear-gradient(160deg, rgba(46,26,8,.88), rgba(30,16,8,.92));
  border: 1px solid rgba(160,90,30,.55);
  border-radius: 16px;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  box-shadow: 0 6px 24px rgba(0,0,0,.55), inset 0 1px 0 rgba(200,130,40,.10);
}

.card-portrait {
  width: 100%;
  aspect-ratio: 3 / 4;
  object-fit: cover;
  object-position: top;
  border-radius: 14px 14px 0 0;
  display: block;
}

.card-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 12px 14px 16px;
}

.card-name   { font-size: 18px; font-weight: 700; color: #f0c060; }
.card-flavor { font-size: 12px; color: #9e8060; line-height: 1.5; }

/* ── Item icons ── */
.card-items {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.item-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 60px;
}

.item-slot-img {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  object-fit: cover;
  border: 1px solid rgba(200,140,40,.4);
  background: rgba(0,0,0,.4);
}

.slot-random .slot-q {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  border: 1px dashed rgba(160,100,30,.5);
  background: rgba(0,0,0,.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: rgba(160,100,30,.7);
}

.item-slot-name {
  font-size: 10px;
  color: #9e7040;
  text-align: center;
  line-height: 1.2;
  max-width: 60px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Skill ── */
.skill-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.skill-icon-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
  transition: transform 0.15s, opacity 0.15s;
}
.skill-icon-btn:hover { transform: scale(1.1); }
.skill-icon-btn:active { transform: scale(0.95); }

.skill-emoji {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(40,80,120,.3);
  border: 1.5px solid rgba(80,150,210,.35);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
  box-shadow: 0 0 8px rgba(80,150,220,.12);
}
.skill-icon-btn.open .skill-emoji {
  background: rgba(40,80,120,.55);
  border-color: rgba(100,170,230,.6);
  box-shadow: 0 0 14px rgba(80,150,220,.35);
}

.skill-label {
  font-size: 10px;
  color: rgba(140,185,220,.7);
  letter-spacing: 1px;
}

.skill-desc {
  font-size: 12px;
  color: #a0c8e0;
  line-height: 1.6;
  text-align: center;
  padding: 4px 8px;
  background: rgba(30,60,100,.25);
  border-radius: 8px;
  border: 1px solid rgba(80,140,200,.18);
  width: 100%;
}

.skill-fade-enter-active, .skill-fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.skill-fade-enter-from, .skill-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* ── Dots ── */
.dots {
  display: flex;
  gap: 8px;
}
.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: rgba(200,140,40,.25);
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
}
.dot.active {
  background: #d4922a;
  transform: scale(1.3);
}

/* ── Confirm button ── */
.choose-btn {
  padding: 12px 48px;
  border-radius: 30px;
  border: 1px solid rgba(200,140,40,.5);
  background: linear-gradient(135deg, #8b5e1a, #5a3a0a);
  color: #f0c060;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 1px;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0,0,0,.4);
  transition: transform 0.12s, box-shadow 0.12s, border-color 0.12s;
}
.choose-btn:hover {
  transform: translateY(-2px);
  border-color: #d4922a;
  box-shadow: 0 6px 20px rgba(180,100,20,.4);
}
.choose-btn:active { transform: translateY(0); }

/* ── Slide transitions ── */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.22s ease;
}
.slide-left-enter-from  { opacity: 0; transform: translateX(30px); }
.slide-left-leave-to    { opacity: 0; transform: translateX(-30px); }
.slide-right-enter-from { opacity: 0; transform: translateX(-30px); }
.slide-right-leave-to   { opacity: 0; transform: translateX(30px); }
</style>
