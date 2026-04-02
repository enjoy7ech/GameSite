<script setup lang="ts">
import { ref } from 'vue'
import PixiBackground from '../components/PixiBackground.vue'

interface Game {
  id: string;
  name: string;
  url: string;
  color: string;
  image?: string;
  orientation?: 'portrait' | 'landscape';
}

const games = ref<Game[]>([
  { id: 'landlord', name: 'LUCKY LANDLORD', url: '/games/lucky-landlord/index.html', color: '#ff00ea', image: '/games/lucky-landlord/assets/logo.png', orientation: 'portrait' },
  { id: 'mtower', name: 'MAGIC TOWER', url: '/games/magic-tower/index.html', color: '#00fff2', image: '/games/magic-tower/cover.png', orientation: 'landscape' },
  { id: 'basket', name: 'BASKET RACE 3D', url: '/games/basket-race/index.html', color: '#ffb700', image: '/games/basket-race/cover.png', orientation: 'landscape' },
  { id: 'tiny-story', name: 'TINY STORY', url: '/games/tiny-story/index.html', color: '#ff7e5f', image: '/games/tiny-story/assets/cover.png', orientation: 'portrait' },
  { id: 'poker', name: 'CYBER POKER', url: '', color: '#00fff2', orientation: 'landscape' }
])

const activeGame = ref<Game | null>(null)
const hoveredGame = ref<Game | null>(null)

import { onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const handleMessage = (event: MessageEvent) => {
  if (event.data === 'close-game') {
    router.push('/')
  }
}

const syncActiveGameFromRoute = () => {
  const gameId = route.params.id as string
  if (gameId) {
    const found = games.value.find(g => g.id === gameId)
    if (found && found.url) {
      activeGame.value = found
    } else {
      activeGame.value = null
    }
  } else {
    activeGame.value = null
  }
}

watch(() => route.params.id, syncActiveGameFromRoute)

onMounted(() => {
  window.addEventListener('message', handleMessage)
  syncActiveGameFromRoute()
})

onUnmounted(() => {
  window.removeEventListener('message', handleMessage)
})

const selectGame = (game: Game) => {
  if (game.url) {
    router.push(`/game/${game.id}`)
  } else {
    alert('System offline: Game coming soon.')
  }
}

const closeGame = () => {
  router.push('/')
}
</script>

<template>
  <main class="home-page" :style="{ '--dynamic-glow': hoveredGame?.color || 'rgba(0, 255, 242, 0.5)' }">
    <PixiBackground />
    
    <!-- Dynamic Ambient Glow -->
    <div class="ambient-glow"></div>

    <div class="hub-container">
      
      <!-- GAME MONITOR (MODAL) -->
      <Transition name="scale">
        <div v-if="activeGame" class="monitor-overlay">
          <div class="monitor-container">
            <div class="monitor-frame" :style="{ 'aspect-ratio': activeGame.orientation === 'portrait' ? '9/16' : '16/9' }">
              <div class="screen-surface">
                <iframe :src="activeGame.url" frameborder="0" class="game-iframe"></iframe>
                <div class="glass-reflection"></div>
              </div>
            </div>
            
            <div class="monitor-controls">
              <div class="nav-status">
                  <span class="status-dot pulsing"></span>
                  <span class="status-text">SYSTEM.ACTIVE // {{ activeGame.name }}</span>
              </div>
              <button class="exit-button" @click="closeGame">
                ESCAPE SYSTEM [X]
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- PREMIUM GAME SHELF -->
      <div class="shelf-wrapper" :class="{ 'inactive': activeGame }">
        <header class="shelf-header">
            <div class="decorator-line"></div>
            <h2 class="section-title">NEURAL SELECTION</h2>
            <div class="decorator-line"></div>
        </header>

        <div class="showcase-grid">
          <div 
            v-for="game in games" 
            :key="game.id" 
            class="card-scene"
            @mouseenter="hoveredGame = game"
            @mouseleave="hoveredGame = null"
            @click="selectGame(game)"
          >
            <div class="card-object" :style="{ '--accent': game.color }">
              <div class="card-face front">
                  <div class="card-inner">
                    <img v-if="game.image" :src="game.image" :alt="game.name" class="game-cover" />
                    <div v-else class="placeholder-art">{{ game.name[0] }}</div>
                    
                    <!-- Scanline and Holo effects -->
                    <div class="scanlines"></div>
                    <div class="holo-shimmer"></div>
                  </div>
              </div>
              <!-- Depth of the card -->
              <div class="card-edge"></div>
            </div>
            
            <div class="card-info">
                <div class="game-name">{{ game.name }}</div>
                <div class="game-status">{{ game.url ? 'READY' : 'OFFLINE' }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Branding -->
    <footer class="footer-brand" v-if="!activeGame">
        <div class="logo-container">
            <span class="logo-text">GAMESITE</span>
            <span class="logo-version">VER 2.0.4</span>
        </div>
    </footer>
  </main>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&display=swap');

.home-page {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #020205;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  --dynamic-glow: #00fff2;
  transition: background 0.5s ease;
}

.ambient-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100vw;
  height: 100vh;
  background: radial-gradient(circle, var(--dynamic-glow) 0%, transparent 60%);
  opacity: 0.15;
  transform: translate(-50%, -50%);
  pointer-events: none;
  filter: blur(80px);
  z-index: 2;
  transition: background 0.5s ease;
}

.hub-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

/* SHELF HEADER */
.shelf-wrapper {
    transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}
.shelf-wrapper.inactive {
    opacity: 0;
    transform: scale(0.95) translateY(20px);
    pointer-events: none;
}

.shelf-header {
    display: flex;
    align-items: center;
    gap: 2rem;
    margin-bottom: 5rem;
    width: 100%;
    justify-content: center;
}

.section-title {
    font-family: 'Syncopate', sans-serif;
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.8em;
    color: rgba(255, 255, 255, 0.5);
}

.decorator-line {
    width: 100px;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
}

/* SHOWCASE GRID */
.showcase-grid {
  display: flex;
  gap: 4rem;
  perspective: 2000px;
}

.card-scene {
  position: relative;
  width: 220px;
  cursor: pointer;
  transition: transform 0.3s ease;
}

/* 3D CARD OBJECT */
.card-object {
  position: relative;
  width: 220px;
  height: 320px;
  transform-style: preserve-3d;
  transition: transform 0.6s cubic-bezier(0.23, 1, 0.32, 1);
}

.card-scene:hover .card-object {
  transform: translateZ(50px) rotateY(-15deg);
}

.card-face {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.card-inner {
    position: relative;
    width: 100%;
    height: 100%;
    background: #0a0a14;
}

.game-cover {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: filter 0.4s ease;
}

.card-scene:hover .game-cover {
    filter: brightness(1.2) contrast(1.1);
}

.placeholder-art {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 6rem;
    font-weight: 900;
    font-family: 'Syncopate', sans-serif;
    color: var(--accent);
    opacity: 0.2;
}

/* GLOW EFFECTS */
.card-scene::after {
    content: '';
    position: absolute;
    top: 10%;
    left: 10%;
    right: 10%;
    bottom: -5%;
    background: var(--accent);
    filter: blur(40px);
    opacity: 0;
    z-index: -1;
    transition: opacity 0.4s ease;
}

.card-scene:hover::after {
    opacity: 0.3;
}

/* SCANLINES */
.scanlines {
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom, rgba(0,0,0,0) 50%, rgba(0,0,0,0.1) 50%);
    background-size: 100% 4px;
    z-index: 2;
    pointer-events: none;
}

.holo-shimmer {
    position: absolute;
    inset: 0;
    background: linear-gradient(105deg, 
        transparent 30%, 
        rgba(255,255,255,0.05) 45%, 
        rgba(255,255,255,0.1) 50%, 
        rgba(255,255,255,0.05) 55%, 
        transparent 70%);
    background-size: 200% 100%;
    background-position: 150% 0;
    z-index: 3;
    pointer-events: none;
    transition: background-position 0.6s ease;
}

.card-scene:hover .holo-shimmer {
    background-position: -50% 0;
}

/* CARD INFO (BELOW) */
.card-info {
    margin-top: 2rem;
    text-align: center;
    transition: transform 0.3s ease;
}

.card-scene:hover .card-info {
    transform: translateY(10px);
}

.game-name {
    font-family: 'Syncopate', sans-serif;
    font-size: 0.75rem;
    font-weight: 700;
    color: white;
    letter-spacing: 0.1em;
    margin-bottom: 0.5rem;
}

.game-status {
    font-size: 0.65rem;
    font-weight: 800;
    background: rgba(255,255,255,0.05);
    color: rgba(255,255,255,0.3);
    padding: 2px 8px;
    border-radius: 2px;
    display: inline-block;
    letter-spacing: 0.1em;
}

.card-scene:hover .game-status {
    color: var(--accent);
    background: rgba(255,255,255,0.1);
}

/* MONITOR OVERLAY */
.monitor-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.9);
  backdrop-filter: blur(20px);
  z-index: 1000;
}

.monitor-container {
    height: 90vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
}

.monitor-frame {
    height: calc(100% - 60px);
    background: #11111a;
    border-radius: 30px;
    padding: 15px;
    border: 1px solid rgba(255,255,255,0.1);
    box-shadow: 0 0 100px rgba(0, 255, 242, 0.1);
}

.screen-surface {
    position: relative;
    width: 100%;
    height: 100%;
    border-radius: 18px;
    overflow: hidden;
    background: #000;
}

.game-iframe { width: 100%; height: 100%; border: none; }

.monitor-controls {
    display: flex;
    justify-content: space-between;
    width: 100%;
    max-width: 400px;
    align-items: center;
}

.nav-status {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    color: rgba(255,255,255,0.5);
    font-family: monospace;
    font-size: 0.7rem;
}

.status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #00fff2;
}

.pulsing {
    animation: pulse 1s infinite alternate;
}

@keyframes pulse {
    from { opacity: 0.3; transform: scale(0.8); }
    to { opacity: 1; transform: scale(1.2); }
}

.exit-button {
    background: transparent;
    border: 1px solid rgba(255,255,255,0.2);
    color: white;
    padding: 8px 16px;
    font-size: 0.7rem;
    cursor: pointer;
    font-family: 'Syncopate', sans-serif;
    transition: all 0.3s;
}

.exit-button:hover {
    background: white;
    color: black;
}

/* Transitions */
.scale-enter-active, .scale-leave-active { transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1); }
.scale-enter-from, .scale-leave-to { opacity: 0; transform: scale(0.9); }

/* Footer Brand */
.footer-brand {
    position: absolute;
    bottom: 3rem;
    width: 100%;
    text-align: center;
    z-index: 5;
}

.logo-container {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
}

.logo-text {
    font-family: 'Syncopate', sans-serif;
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: 1em;
    color: white;
    margin-right: -1em; /* Offset for tracking */
}

.logo-version {
    font-size: 0.6rem;
    color: rgba(255,255,255,0.2);
    letter-spacing: 0.5em;
}
</style>
