<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import * as PIXI from 'pixi.js'
import { GameCore } from '../libs/game-core'

const pixiContainer = ref<HTMLDivElement | null>(null)
let app: PIXI.Application | null = null

const initPixi = async () => {
  if (!pixiContainer.value) return

  app = new PIXI.Application()
  await app.init({
    resizeTo: window,
    backgroundColor: 0x050510,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  })

  pixiContainer.value.appendChild(app.canvas)

  const particleCount = 150
  const particles: any[] = []
  const container = new PIXI.Container()
  app.stage.addChild(container)

  // Create a simple circular texture for particles
  const graphics = new PIXI.Graphics()
    .circle(0, 0, 4)
    .fill({ color: 0xffffff, alpha: 1 })
  
  const texture = app.renderer.generateTexture(graphics)

  for (let i = 0; i < particleCount; i++) {
    const p = new PIXI.Sprite(texture)
    const size = GameCore.utils.randomRange(1, 3)
    p.anchor.set(0.5)
    p.scale.set(size / 4)
    p.x = GameCore.utils.randomRange(0, app.screen.width)
    p.y = GameCore.utils.randomRange(0, app.screen.height)
    
    // Random cyan/magenta/white colors
    const colors = [0x00fff2, 0xff00ea, 0xffffff]
    p.tint = colors[Math.floor(GameCore.utils.randomRange(0, colors.length))]
    p.alpha = GameCore.utils.randomRange(0.2, 0.7)
    
    const speed = GameCore.utils.randomRange(0.1, 0.6)
    const angle = GameCore.utils.randomRange(0, Math.PI * 2)
    
    particles.push({
      sprite: p,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      originAlpha: p.alpha,
      pulse: Math.random() * 0.1
    })
    
    container.addChild(p)
  }

  // Animation Loop
  app.ticker.add((ticker) => {
    const delta = ticker.deltaTime
    particles.forEach(p => {
      p.sprite.x += p.vx * delta
      p.sprite.y += p.vy * delta
      
      // Wrap around
      if (p.sprite.x < 0) p.sprite.x = app!.screen.width
      if (p.sprite.x > app!.screen.width) p.sprite.x = 0
      if (p.sprite.y < 0) p.sprite.y = app!.screen.height
      if (p.sprite.y > app!.screen.height) p.sprite.y = 0
      
      // Subtle pulse
      p.sprite.alpha = p.originAlpha + Math.sin(ticker.lastTime / 1000 + p.pulse * 100) * 0.1
    })
  })
}

onMounted(() => {
  initPixi()
})

onUnmounted(() => {
  if (app) {
    app.destroy(true, { children: true, texture: true })
  }
})
</script>

<template>
  <div ref="pixiContainer" class="pixi-background"></div>
</template>

<style scoped>
.pixi-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  pointer-events: none;
}
</style>
