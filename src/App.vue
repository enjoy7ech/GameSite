<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="app-layout">
    <nav v-if="!$route.path.startsWith('/game/')" class="main-nav">
      <div class="logo">GAMECENTER</div>
      <div class="nav-links">
        <router-link to="/">Home</router-link>

        <router-link to="/about">About</router-link>
      </div>
    </nav>
    <RouterView />
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&family=Outfit:wght@300;400;600;800&display=swap');

:root {
  --bg-dark: #050510;
  --accent-cyan: #00fff2;
  --accent-pink: #ff00ea;
  --text-main: #ffffff;
  --text-dim: rgba(255, 255, 255, 0.6);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', sans-serif;
  background: var(--bg-dark);
  color: var(--text-main);
  overflow-x: hidden;
}

.app-layout {
  min-height: 100vh;
  width: 100%;
}

.main-nav {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  padding: 1rem 2rem;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  z-index: 100;
  background: transparent;
}

.logo {
  display: none; /* Already in HomeView */
}

.nav-links {
  display: flex;
  gap: 2rem;
}

.nav-links a {
  color: var(--text-main);
  text-decoration: none;
  font-weight: 500;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.7;
  transition: opacity 0.3s ease;
}

.nav-links a:hover, .nav-links a.router-link-active {
  opacity: 1;
}

.nav-links a.router-link-active {
  color: var(--accent-cyan);
}
</style>
