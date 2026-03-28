<script setup lang="ts">
import PixiBackground from '../components/PixiBackground.vue'
</script>

<template>
  <main class="about-page">
    <PixiBackground />
    
    <div class="content-container">
      <header class="about-header">
        <h1 class="glitch-text" data-text="NEURAL OVERVIEW">NEURAL OVERVIEW</h1>
        <div class="status-line">
          <span class="label">CORE STATUS:</span>
          <span class="value cyan">OPERATIONAL</span>
          <span class="separator">|</span>
          <span class="label">VERSION:</span>
          <span class="value pink">2.0.4-LOCKED</span>
        </div>
      </header>

      <section class="info-grid">
        <div class="info-card">
          <h3 class="card-title">SYSTEM PROTOCOL</h3>
          <p class="card-text">
            GameSite is a next-generation neural interface designed for high-fidelity interactive entertainment. 
            We bridge the gap between human cognition and synthetic realities through our proprietary neural linking technology.
          </p>
          <div class="card-footer">
            <span class="tag">#00-PROTOCOL</span>
          </div>
        </div>

        <div class="info-card">
          <h3 class="card-title">DEVELOPMENT MANIFESTO</h3>
          <p class="card-text">
            Our mission is to push the boundaries of browser-based gaming. Each project is a digital artifact, 
            meticulously crafted to challenge your perception and provide immersive tactical feedback.
          </p>
          <div class="card-footer">
            <span class="tag">#01-VISION</span>
          </div>
        </div>

        <div class="info-card wide">
          <h3 class="card-title">CREDITS & NETWORK</h3>
          <div class="credits-list">
            <div class="credit-item">
              <span class="role">ARCHITECT</span>
              <span class="name">@enjoy7ech</span>
            </div>
            <div class="credit-item">
              <span class="role">UI/UX CORE</span>
              <span class="name">CYBERNETICS-V2</span>
            </div>
            <div class="credit-item">
              <span class="role">BACKEND GRID</span>
              <span class="name">NEURAL-DISTRIBUTION-NODE</span>
            </div>
          </div>
        </div>
      </section>

      <router-link to="/" class="back-link">
        <span class="arrow">←</span> RETURN TO HUB
      </router-link>
    </div>

    <footer class="footer-brand">
        <div class="logo-container">
            <span class="logo-text">GAMESITE</span>
            <span class="logo-version">ALL RIGHTS RESERVED // 2026-INFINITE</span>
        </div>
    </footer>
  </main>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=Outfit:wght@300;400;600&display=swap');

.about-page {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
  background: #020205;
  color: white;
  font-family: 'Outfit', sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8rem 2rem 4rem;
}

.content-container {
  max-width: 900px;
  width: 100%;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 4rem;
}

.about-header {
  text-align: center;
}

.glitch-text {
  font-family: 'Syncopate', sans-serif;
  font-size: 3.5rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  color: white;
  position: relative;
  margin-bottom: 1rem;
}

.status-line {
  font-family: monospace;
  font-size: 0.8rem;
  display: flex;
  justify-content: center;
  gap: 1rem;
  opacity: 0.7;
  letter-spacing: 0.1em;
}

.cyan { color: #00fff2; }
.pink { color: #ff00ea; }
.separator { opacity: 0.3; }

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.info-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 2.5rem;
  border-radius: 4px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.info-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 2px;
  height: 100%;
  background: #00fff2;
  opacity: 0.5;
}

.info-card:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
  transform: translateY(-5px);
}

.info-card.wide {
  grid-column: span 2;
}

.card-title {
  font-family: 'Syncopate', sans-serif;
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
  color: rgba(255, 255, 255, 0.6);
  letter-spacing: 0.3em;
}

.card-text {
  font-size: 1.1rem;
  line-height: 1.8;
  font-weight: 300;
  opacity: 0.8;
}

.card-footer {
  margin-top: 2rem;
  display: flex;
  justify-content: flex-end;
}

.tag {
  font-family: monospace;
  font-size: 0.7rem;
  color: #00fff2;
  opacity: 0.5;
}

.credits-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.credit-item {
  display: flex;
  justify-content: space-between;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.1);
  padding-bottom: 0.5rem;
}

.role {
  font-size: 0.8rem;
  opacity: 0.5;
  letter-spacing: 0.1em;
}

.name {
  font-weight: 600;
  color: #00fff2;
}

.back-link {
  align-self: center;
  color: white;
  text-decoration: none;
  font-family: 'Syncopate', sans-serif;
  font-size: 0.8rem;
  letter-spacing: 0.2em;
  padding: 1rem 2rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
}

.back-link:hover {
  background: white;
  color: black;
}

.footer-brand {
    margin-top: 4rem;
    width: 100%;
    text-align: center;
    padding-bottom: 4rem;
}

.logo-text {
    font-family: 'Syncopate', sans-serif;
    font-size: 1.2rem;
    font-weight: 700;
    letter-spacing: 1em;
    color: white;
    margin-right: -1em;
    opacity: 0.5;
}

.logo-version {
    display: block;
    font-size: 0.6rem;
    color: rgba(255,255,255,0.2);
    letter-spacing: 0.3em;
    margin-top: 0.5rem;
}

/* Animations */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.content-container > * {
  animation: fadeInUp 0.8s ease-out both;
}

.content-container > *:nth-child(2) { animation-delay: 0.2s; }
.content-container > *:nth-child(3) { animation-delay: 0.4s; }
</style>
