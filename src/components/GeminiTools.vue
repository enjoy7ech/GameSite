<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { GeminiService } from '../libs/GeminiService'

interface Preset {
  id: string;
  name: string;
  prompt: string;
}

const isOpen = ref(false)
const position = ref({ x: window.innerWidth - 80, y: window.innerHeight - 80 })
const isDragging = ref(false)
const activeTab = ref('text') // 'config', 'text', 'image', 'matting'

// Configuration & State
const apiKey = ref(localStorage.getItem('gemini_api_key') || '')
const textModel = ref(localStorage.getItem('gemini_text_model') || 'gemini-1.5-flash-latest')
const imageModel = ref(localStorage.getItem('gemini_image_model') || 'gemini-1.5-flash-latest')

const textPrefix = ref(localStorage.getItem('gemini_text_prefix') || '')
const textPrompt = ref('')
const imagePrefix = ref(localStorage.getItem('gemini_image_prefix') || '')
const imagePrompt = ref('')
const result = ref('')
const imageUrl = ref('')
const isLoading = ref(false)
const availableModels = ref<any[]>([])
const manualMattingSource = ref('')
const manualMattingResult = ref('')
const isMattingLoading = ref(false)
const mattingFileInput = ref<HTMLInputElement | null>(null)

const triggerMattingUpload = () => {
  mattingFileInput.value?.click()
}

// Presets
const defaultTextPresets: Preset[] = [
  { id: '1', name: '剧情续写', prompt: '请基于以下段落继续编写一段紧张刺激的剧情，注意氛围描写：\n\n' },
  { id: '2', name: '角色台词', prompt: '请为以下角色设计一段充满个性的台词，背景场景为 [场景描述]：\n' }
]

const defaultImagePresets: Preset[] = [
  { id: '1', name: '二次元立绘', prompt: 'anime style, character concept art, full body, white background, high quality, masterpiece, ' },
  { id: '2', name: '赛博朋克夜景', prompt: 'cyberpunk city, neon lights, rainy street, cinematic lighting, ultra detailed, 8k, ' }
]

const textPresets = ref<Preset[]>(JSON.parse(localStorage.getItem('gemini_text_presets') || JSON.stringify(defaultTextPresets)))
const imagePresets = ref<Preset[]>(JSON.parse(localStorage.getItem('gemini_image_presets') || JSON.stringify(defaultImagePresets)))

const gemini = new GeminiService(apiKey.value, textModel.value, imageModel.value)

onMounted(async () => {
  if (apiKey.value) {
    const models = await gemini.listModels()
    availableModels.value = models
  }
})

const shouldRemoveBg = ref(localStorage.getItem('gemini_remove_bg') === 'true')
const shouldCompressWebp = ref(localStorage.getItem('gemini_compress_webp') === 'true')
const webpQuality = ref(Number(localStorage.getItem('gemini_webp_quality')) || 0.8)
const selectedRatio = ref(localStorage.getItem('gemini_ratio') || '1024x1024')
const customWidth = ref(Number(localStorage.getItem('gemini_custom_width')) || 1024)
const customHeight = ref(Number(localStorage.getItem('gemini_custom_height')) || 1024)

// Persistence Watchers
watch(apiKey, (newVal: string) => localStorage.setItem('gemini_api_key', newVal))
watch(textPrefix, (newVal: string) => localStorage.setItem('gemini_text_prefix', newVal))
watch(imagePrefix, (newVal: string) => localStorage.setItem('gemini_image_prefix', newVal))
watch(shouldRemoveBg, (newVal: boolean) => localStorage.setItem('gemini_remove_bg', newVal.toString()))
watch(shouldCompressWebp, (newVal: boolean) => localStorage.setItem('gemini_compress_webp', newVal.toString()))
watch(webpQuality, (newVal: number) => localStorage.setItem('gemini_webp_quality', newVal.toString()))
watch(selectedRatio, (newVal: string) => localStorage.setItem('gemini_ratio', newVal))
watch(customWidth, (newVal: number) => localStorage.setItem('gemini_custom_width', newVal.toString()))
watch(customHeight, (newVal: number) => localStorage.setItem('gemini_custom_height', newVal.toString()))
watch(textPresets, (newVal: Preset[]) => localStorage.setItem('gemini_text_presets', JSON.stringify(newVal)), { deep: true })
watch(imagePresets, (newVal: Preset[]) => localStorage.setItem('gemini_image_presets', JSON.stringify(newVal)), { deep: true })
watch(textModel, (newVal: string) => {
  localStorage.setItem('gemini_text_model', newVal)
  gemini.updateTextModel(newVal)
})
watch(imageModel, (newVal: string) => {
  localStorage.setItem('gemini_image_model', newVal)
  gemini.updateImageModel(newVal)
})

const saveConfig = () => {
  if (!apiKey.value) return alert('请输入 API Key')
  localStorage.setItem('gemini_api_key', apiKey.value)
  gemini.initClient(apiKey.value, textModel.value, imageModel.value)
  
  gemini.listModels().then(models => {
    availableModels.value = models
    if (models.length > 0) {
      alert('配置已保存，模型列表已更新')
    } else {
      alert('配置已保存，但未能获取到模型列表，请检查网络或密钥是否有效')
    }
  })
}

const applyPreset = (tab: 'text' | 'image', prompt: string) => {
  if (tab === 'text') textPrefix.value = prompt
  else imagePrefix.value = prompt
}

const saveCurrentAsPreset = (tab: 'text' | 'image') => {
  const currentPrefix = tab === 'text' ? textPrefix.value : imagePrefix.value
  if (!currentPrefix) return alert('预设内容不能为空')
  
  const name = window.prompt('请输入预设名称:', '新预设')
  if (!name) return

  const newPreset: Preset = {
    id: Date.now().toString(),
    name,
    prompt: currentPrefix
  }

  if (tab === 'text') textPresets.value.push(newPreset)
  else imagePresets.value.push(newPreset)
}

const removePreset = (tab: 'text' | 'image', id: string) => {
  if (tab === 'text') {
    textPresets.value = textPresets.value.filter((p: Preset) => p.id !== id)
  } else {
    imagePresets.value = imagePresets.value.filter((p: Preset) => p.id !== id)
  }
}

const statusMessage = ref('')
const showStatus = (msg: string) => {
  statusMessage.value = msg
  setTimeout(() => statusMessage.value = '', 3000)
}

const generateText = async () => {
  if (!textPrompt.value && !textPrefix.value) return
  isLoading.value = true
  result.value = ''
  const fullPrompt = textPrefix.value ? `${textPrefix.value}\n\n${textPrompt.value}` : textPrompt.value
  result.value = await gemini.generateText(fullPrompt)
  isLoading.value = false
  
  if (result.value && !result.value.startsWith('生成失败')) {
    await navigator.clipboard.writeText(result.value)
    showStatus('文本已生成并复制到剪切板')
  }
}

const generateImage = async () => {
  if (!imagePrompt.value && !imagePrefix.value) return
  isLoading.value = true
  imageUrl.value = ''
  result.value = ''
  
  const fullPrompt = imagePrefix.value ? `${imagePrefix.value}\n${imagePrompt.value}` : imagePrompt.value
  
  const res = await gemini.generateImage(fullPrompt, {
    removeBg: shouldRemoveBg.value,
    compressWebp: shouldCompressWebp.value,
    webpQuality: webpQuality.value,
    aspectRatio: selectedRatio.value === 'custom' 
      ? calculateClosestRatio(customWidth.value, customHeight.value)
      : mapResolutionToRatio(selectedRatio.value),
    resolution: selectedRatio.value === 'custom'
      ? `${customWidth.value}x${customHeight.value}`
      : selectedRatio.value
  })

  if ('url' in res) {
    imageUrl.value = res.url
    // 自动执行下载
    const link = document.createElement('a')
    link.href = res.url
    const ext = shouldCompressWebp.value ? 'webp' : 'png'
    link.download = `gemini_${Date.now()}.${ext}`
    link.click()
    showStatus('图像已具现并自动下载')
  } else if ('error' in res) {
    result.value = res.error
  } else {
    result.value = '发生未知错误'
  }
  isLoading.value = false
}

const copyResult = () => {
  navigator.clipboard.writeText(result.value)
  alert('已复制到剪切板')
}

const onMattingFileChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (event) => {
    manualMattingSource.value = event.target?.result as string
    manualMattingResult.value = ''
  }
  reader.readAsDataURL(file)
}

const runManualMatting = async () => {
  if (!manualMattingSource.value) return
  isMattingLoading.value = true
  try {
    const base64 = manualMattingSource.value.split(',')[1]
    const res = await gemini.chromaKey(base64)
    manualMattingResult.value = res.url
    showStatus('抠像完成')
  } catch (e: any) {
    alert('抠像失败: ' + e.message)
  } finally {
    isMattingLoading.value = false
  }
}

// Drag logic
let startX = 0
let startY = 0
let initialX = 0
let initialY = 0

const onDragStart = (e: MouseEvent | TouchEvent) => {
  isDragging.value = true
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
  
  startX = clientX
  startY = clientY
  initialX = position.value.x
  initialY = position.value.y

  window.addEventListener('mousemove', onDragMove)
  window.addEventListener('mouseup', onDragEnd)
  window.addEventListener('touchmove', onDragMove, { passive: false })
  window.addEventListener('touchend', onDragEnd)
}

const onDragMove = (e: MouseEvent | TouchEvent) => {
  if (!isDragging.value) return
  if ('touches' in e) e.preventDefault()
  const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX
  const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY
  position.value = {
    x: initialX + (clientX - startX),
    y: initialY + (clientY - startY)
  }
}

const onDragEnd = () => {
  isDragging.value = false
  window.removeEventListener('mousemove', onDragMove)
  window.removeEventListener('mouseup', onDragEnd)
  window.removeEventListener('touchmove', onDragMove)
  window.removeEventListener('touchend', onDragEnd)
}

onUnmounted(() => {
  onDragEnd()
})
const mapResolutionToRatio = (res: string) => {
  if (res.includes('1:1') || res === '1024x1024' || res === '512x512' || res === '256x256') return '1:1'
  if (res.includes('9:16') || res === '768x1280' || res === '512x896') return '9:16'
  if (res.includes('16:9') || res === '1280x720' || res === '896x512') return '16:9'
  if (res.includes('4:3') || res === '1024x768' || res === '640x480') return '4:3'
  if (res.includes('3:2') || res === '1280x854' || res === '480x320') return '3:2'
  return '1:1'
}

const calculateClosestRatio = (w: number, h: number) => {
  const ratio = w / h
  if (Math.abs(ratio - 1) < 0.1) return '1:1'
  if (Math.abs(ratio - 9/16) < 0.1) return '9:16'
  if (Math.abs(ratio - 16/9) < 0.1) return '16:9'
  if (Math.abs(ratio - 4/3) < 0.1) return '4:3'
  if (Math.abs(ratio - 3/4) < 0.1) return '3:4'
  if (Math.abs(ratio - 3/2) < 0.1) return '3:2'
  if (ratio > 1.5) return '16:9'
  if (ratio < 0.6) return '9:16'
  return '1:1'
}
</script>

<template>
  <div 
    class="gemini-floating-tool"
    :style="{ left: position.x + 'px', top: position.y + 'px' }"
  >
    <!-- 悬浮按钮 -->
    <div 
      class="tool-button" 
      @mousedown.stop="onDragStart"
      @touchstart.stop="onDragStart"
      @click="isOpen = !isOpen"
      :class="{ 'is-open': isOpen, 'is-dragging': isDragging }"
    >
      <div class="icon">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L14.85 8.65L22 9.25L16.5 13.8L18.1 21L12 17.25L5.9 21L7.5 13.8L2 9.25L9.15 8.65L12 2Z" fill="currentColor"/>
        </svg>
      </div>
      <div class="glow-ring"></div>
    </div>

    <!-- 主面板 -->
    <Transition name="panel-slide">
      <div v-if="isOpen" class="tool-panel" @mousedown.stop @touchstart.stop>
        <div class="panel-header">
          <span class="title">GEMINI 智能助手</span>
          <div v-if="statusMessage" class="status-bubble">{{ statusMessage }}</div>
          <button class="close-btn" @click="isOpen = false">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- 标签页 -->
        <div class="tab-nav">
          <button 
            :class="{ active: activeTab === 'text', disabled: !apiKey }" 
            :disabled="!apiKey"
            @click="activeTab = 'text'"
          >
            文本生成
          </button>
          <button 
            :class="{ active: activeTab === 'image', disabled: !apiKey }" 
            :disabled="!apiKey"
            @click="activeTab = 'image'"
          >
            图像生成
          </button>
          <button 
            :class="{ active: activeTab === 'matting', disabled: !apiKey }" 
            :disabled="!apiKey"
            @click="activeTab = 'matting'"
          >
            手动抠像
          </button>
          <button :class="{ active: activeTab === 'config' }" @click="activeTab = 'config'">参数配置</button>
        </div>

        <div class="tab-content">
          <!-- 配置标签页 -->
          <div v-if="activeTab === 'config'" class="config-tab">
            <div class="input-group">
              <label>Google Gemini API 密钥</label>
              <input v-model="apiKey" type="password" placeholder="请输入你的 API Key..." />
              <p class="hint">密钥将加密保存在你的本地浏览器中。</p>
            </div>
            
            <button class="action-btn secondary" @click="saveConfig">保存并应用配置</button>
          </div>

          <!-- 文本标签页 -->
          <div v-if="activeTab === 'text'" class="tab-pane">
            <div class="model-quick-select">
              <select v-model="textModel" class="compact-select">
                <option v-for="m in availableModels" :key="m.name" :value="m.name">{{ m.displayName || m.name }}</option>
                <option v-if="availableModels.length === 0" value="gemini-1.5-flash-latest">gemini-1.5-flash-latest</option>
              </select>
            </div>

            <div class="presets">
              <div class="header-row">
                <div class="label">常用预设:</div>
                <button class="save-preset-btn" @click="saveCurrentAsPreset('text')">保存当前为预设</button>
              </div>
              <div class="preset-list">
                <div v-for="p in textPresets" :key="p.id" class="preset-item">
                  <span class="preset-name" @click="applyPreset('text', p.prompt)">{{ p.name }}</span>
                  <button class="del-btn" @click="removePreset('text', p.id)">×</button>
                </div>
              </div>
            </div>
            <div class="input-units">
              <div class="input-unit">
                <div class="unit-label">预设 (Context)</div>
                <textarea v-model="textPrefix" placeholder="在此输入背景设定、角色性格、任务指南等..." class="prefix-textarea"></textarea>
              </div>
              <div class="input-unit">
                <div class="unit-label">题词 (Prompt)</div>
                <textarea v-model="textPrompt" placeholder="有什么我可以帮你的吗？..."></textarea>
              </div>
            </div>
            <button class="action-btn primary" :disabled="isLoading" @click="generateText">
              <span v-if="!isLoading">执行神经生成</span>
              <span v-else class="loading-text">处理中...</span>
            </button>
            
            <div v-if="result" class="result-area">
              <div class="result-header">
                <span>输出缓冲区</span>
                <button @click="copyResult">复制</button>
              </div>
              <div class="result-body">{{ result }}</div>
            </div>
          </div>

          <!-- 图像标签页 -->
          <div v-if="activeTab === 'image'" class="tab-pane">
            <div class="model-quick-select">
              <select v-model="imageModel" class="compact-select">
                <option v-for="m in availableModels" :key="m.name" :value="m.name">{{ m.displayName || m.name }}</option>
                <option v-if="availableModels.length === 0" value="gemini-1.5-flash-latest">gemini-1.5-flash-latest</option>
              </select>
            </div>

            <div class="presets">
              <div class="header-row">
                <div class="label">风格预设:</div>
                <button class="save-preset-btn" @click="saveCurrentAsPreset('image')">保存当前为预设</button>
              </div>
              <div class="preset-list">
                <div v-for="p in imagePresets" :key="p.id" class="preset-item">
                  <span class="preset-name" @click="applyPreset('image', p.prompt)">{{ p.name }}</span>
                  <button class="del-btn" @click="removePreset('image', p.id)">×</button>
                </div>
              </div>
            </div>
            <div class="image-options-container">
              <div class="image-options-row">
                <div class="option-switches">
                  <label class="checkbox-label" title="使用绿幕技术自动去除图像背景">
                    <input type="checkbox" v-model="shouldRemoveBg" />
                    <span>自动抠图</span>
                  </label>
                  <label class="checkbox-label" title="将生成图像压缩为 WebP 格式以节省空间">
                    <input type="checkbox" v-model="shouldCompressWebp" />
                    <span>图像压缩 (WebP)</span>
                  </label>
                </div>
                
                <div class="ratio-control">
                  <div class="aspect-ratio-selector">
                    <label>画面比例</label>
                    <select v-model="selectedRatio" class="mini-select">
                      <option value="1:1">正方形 (1:1)</option>
                      <option value="16:9">横屏 (16:9)</option>
                      <option value="9:16">竖屏 (9:16)</option>
                      <option value="4:3">标准 (4:3)</option>
                      <option value="3:2">胶片 (3:2)</option>
                      <option value="custom">-- 自定义比例 --</option>
                    </select>
                  </div>
                  <div v-if="selectedRatio === 'custom'" class="custom-res-inputs">
                    <input type="number" v-model="customWidth" placeholder="宽" />
                    <span>×</span>
                    <input type="number" v-model="customHeight" placeholder="高" />
                  </div>
                </div>
              </div>

              <!-- WebP Quality Slider -->
              <Transition name="fade-slide">
                <div v-if="shouldCompressWebp" class="quality-control-row">
                  <div class="quality-label">
                    <span>压缩质量</span>
                    <span class="quality-value">{{ Math.round(webpQuality * 100) }}%</span>
                  </div>
                  <input 
                    type="range" 
                    v-model.number="webpQuality" 
                    min="0.1" 
                    max="1.0" 
                    step="0.05" 
                    class="quality-slider"
                  />
                </div>
              </Transition>
            </div>

            <div class="input-units">
              <div class="input-unit">
                <div class="unit-label">预设 (Style/Preset)</div>
                <textarea v-model="imagePrefix" placeholder="复古炼金术/蒸汽朋克、金色勾边、史诗感..." class="prefix-textarea"></textarea>
              </div>
              <div class="input-unit">
                <div class="unit-label">题词 (Subject/Prompt)</div>
                <textarea v-model="imagePrompt" placeholder="具体描述你想要生成的图像主体..."></textarea>
              </div>
            </div>
            <button class="action-btn primary" :disabled="isLoading" @click="generateImage">
              <span v-if="!isLoading">具现化视觉资产</span>
              <span v-else class="loading-text">渲染中...</span>
            </button>
            
            <div v-if="imageUrl" class="image-result">
              <img :src="imageUrl" alt="生成的图像" />
              <div class="img-actions">
                <a :href="imageUrl" target="_blank" :download="`gemini-gen.${shouldCompressWebp ? 'webp' : 'png'}`">下载图像</a>
              </div>
            </div>
            <div v-else-if="result" class="result-area error">
              {{ result }}
            </div>
          </div>

          <!-- 手动抠像标签页 -->
          <div v-if="activeTab === 'matting'" class="tab-pane">
            <div class="input-unit">
              <div class="unit-label">上传原始图片 (绿色背景效果最佳)</div>
              <div class="matting-upload-area" @click="triggerMattingUpload">
                <input type="file" ref="mattingFileInput" style="display: none" accept="image/*" @change="onMattingFileChange" />
                <div v-if="!manualMattingSource" class="upload-placeholder">
                  <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                  </svg>
                  <span>点击上传图片</span>
                </div>
                <img v-else :src="manualMattingSource" class="preview-img" />
              </div>
            </div>
            
            <button class="action-btn primary" :disabled="!manualMattingSource || isMattingLoading" @click="runManualMatting">
              <span v-if="!isMattingLoading">执行智能抠像</span>
              <span v-else class="loading-text">处理中...</span>
            </button>
            
            <div v-if="manualMattingResult" class="image-result matting-result">
              <div class="unit-label">抠像结果预览</div>
              <div class="result-box">
                <img :src="manualMattingResult" alt="抠像结果" />
              </div>
              <div class="img-actions">
                <a :href="manualMattingResult" :download="`gemini_matting_${Date.now()}.png`" class="download-link">下载透明背景图片</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.gemini-floating-tool {
  position: fixed;
  z-index: 99999;
  font-family: 'Inter', 'Noto Sans SC', sans-serif;
}

.tool-button {
  width: 56px;
  height: 56px;
  background: rgba(10, 10, 20, 0.85);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(0, 255, 242, 0.4);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  transition: all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
  box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 15px rgba(0, 255, 242, 0.2);
  color: #00fff2;
  position: relative;
}

.tool-button:hover {
  transform: scale(1.1);
  border-color: #00fff2;
  box-shadow: 0 12px 40px rgba(0,0,0,0.6), 0 0 25px rgba(0, 255, 242, 0.5);
}

.tool-button.is-open {
  background: #00fff2;
  color: #0a0a14;
  transform: rotate(45deg);
}

.glow-ring {
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  border: 1px solid #00fff2;
  opacity: 0.3;
  animation: pulse-ring 2s infinite;
}

@keyframes pulse-ring {
  0% { transform: scale(1); opacity: 0.3; }
  50% { transform: scale(1.15); opacity: 0.1; }
  100% { transform: scale(1); opacity: 0.3; }
}

.tool-panel {
  position: absolute;
  bottom: 70px;
  right: 0;
  width: 380px;
  background: #0d0d18;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 25px 100px rgba(0,0,0,0.9);
  display: flex;
  flex-direction: column;
}

.panel-header {
  padding: 16px 20px;
  background: rgba(255,255,255,0.03);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.title {
  font-family: 'Syncopate', sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  color: #00fff2;
  text-transform: uppercase;
}

.status-bubble {
  position: absolute;
  top: 50px;
  left: 50%;
  transform: translateX(-50%);
  background: #00fff2;
  color: #0d0d18;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 700;
  box-shadow: 0 4px 12px rgba(0, 255, 242, 0.4);
  animation: float-up 0.3s ease-out;
  pointer-events: none;
  z-index: 100;
}

@keyframes float-up {
  from { opacity: 0; transform: translate(-50%, 10px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}

.tab-nav {
  display: flex;
  background: rgba(0,0,0,0.2);
  padding: 4px;
}

.tab-nav button {
  flex: 1;
  padding: 10px;
  background: none;
  border: none;
  color: rgba(255,255,255,0.4);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  border-radius: 12px;
}

.tab-nav button.active {
  color: #00fff2;
  background: rgba(0, 255, 242, 0.1);
}

.tab-nav button.disabled {
  opacity: 0.3;
  cursor: not-allowed;
  filter: grayscale(1);
}

.tab-content {
  padding: 20px;
  max-height: 550px;
  overflow-y: auto;
}

.input-group {
  margin-bottom: 16px;
}

.input-group label {
  display: block;
  font-size: 0.7rem;
  color: rgba(255,255,255,0.5);
  margin-bottom: 8px;
  letter-spacing: 0.05em;
}

.input-group input, .input-group select, textarea {
  width: 100%;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: white;
  padding: 12px;
  font-size: 0.9rem;
  transition: all 0.3s;
  resize: vertical;
}

.input-units {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.input-unit {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.unit-label {
  font-size: 0.65rem;
  color: rgba(0, 255, 242, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 700;
  padding-left: 2px;
}

.prefix-textarea {
  min-height: 80px;
  background: rgba(0, 255, 242, 0.03) !important;
  border-color: rgba(0, 255, 242, 0.15) !important;
  font-size: 0.8rem !important;
}

.prefix-textarea:focus {
  border-color: rgba(0, 255, 242, 0.4) !important;
  background: rgba(0, 255, 242, 0.05) !important;
  outline: none;
}

.input-group select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;
}

.model-quick-select {
  margin-bottom: 12px;
}

.compact-select {
  width: 100%;
  background: rgba(13, 13, 24, 0.9);
  border: 1px solid rgba(0, 255, 242, 0.3);
  color: #00fff2;
  font-size: 0.75rem;
  padding: 6px 32px 6px 12px;
  border-radius: 8px;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2300fff2' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
}

.compact-select option, .mini-select option, .input-group select option {
  background-color: #1a1a2e;
  color: white;
}

.image-options-container {
  margin-bottom: 16px;
  background: rgba(255, 255, 255, 0.03);
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.image-options-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.option-switches {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 140px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  white-space: nowrap;
}

.checkbox-label input {
  width: 16px;
  height: 16px;
  accent-color: #00fff2;
  cursor: pointer;
}

.ratio-control {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.quality-control-row {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.quality-label {
  display: flex;
  justify-content: space-between;
  font-size: 0.7rem;
  color: rgba(0, 255, 242, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}

.quality-value {
  color: #00fff2;
}

.quality-slider {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  appearance: none;
  outline: none;
}

.quality-slider::-webkit-slider-thumb {
  appearance: none;
  width: 14px;
  height: 14px;
  background: #00fff2;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 0 10px rgba(0, 255, 242, 0.5);
  transition: all 0.2s;
}

.quality-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
  box-shadow: 0 0 15px rgba(0, 255, 242, 0.8);
}

.fade-slide-enter-active, .fade-slide-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-from, .fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.custom-res-inputs {
  display: flex;
  align-items: center;
  gap: 4px;
  animation: fadeIn 0.3s ease;
}

.custom-res-inputs input {
  width: 60px;
  background: rgba(0, 255, 242, 0.05);
  border: 1px solid rgba(0, 255, 242, 0.2);
  border-radius: 4px;
  color: #00fff2;
  font-size: 0.7rem;
  padding: 2px 4px;
  text-align: center;
}

.custom-res-inputs span {
  color: rgba(255, 255, 255, 0.3);
  font-size: 0.7rem;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}

.mini-select {
  flex: 1;
  background: rgba(13, 13, 24, 0.9);
  border: 1px solid rgba(0, 255, 242, 0.3);
  color: #00fff2;
  font-size: 0.7rem;
  padding: 4px 24px 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2300fff2' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
}

.presets {
  margin-bottom: 16px;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.header-row .label {
  font-size: 0.7rem;
  color: rgba(255,255,255,0.4);
}

.save-preset-btn {
  background: none;
  border: 1px dashed rgba(0, 255, 242, 0.3);
  color: #00fff2;
  font-size: 0.65rem;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.save-preset-btn:hover {
  background: rgba(0, 255, 242, 0.1);
  border-style: solid;
}

.preset-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.preset-item {
  display: flex;
  align-items: center;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 6px;
  overflow: hidden;
  transition: all 0.2s;
}

.preset-item:hover {
  border-color: #00fff2;
  background: rgba(0, 255, 242, 0.05);
}

.preset-name {
  font-size: 0.75rem;
  padding: 6px 10px;
  color: rgba(255,255,255,0.8);
  cursor: pointer;
}

.del-btn {
  background: rgba(255,255,255,0.05);
  border: none;
  border-left: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.4);
  padding: 4px 8px;
  cursor: pointer;
  font-size: 0.9rem;
  line-height: 1;
}

.del-btn:hover {
  background: rgba(255, 74, 74, 0.2);
  color: #ff4a4a;
}

.action-btn {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: all 0.3s;
}

.action-btn.primary {
  background: linear-gradient(135deg, #00fff2 0%, #0099ff 100%);
  color: #0a0a14;
}

.action-btn.primary:hover:not(:disabled) {
  box-shadow: 0 0 25px rgba(0, 255, 242, 0.5);
  transform: translateY(-1px);
}

.action-btn.secondary {
  background: rgba(255,255,255,0.06);
  color: white;
  border: 1px solid rgba(255,255,255,0.1);
}

.result-area {
  margin-top: 24px;
  background: rgba(0,0,0,0.3);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  overflow: hidden;
}

.result-header {
  padding: 10px 16px;
  background: rgba(255,255,255,0.04);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.7rem;
  color: rgba(255,255,255,0.4);
}

.result-header button {
  background: none;
  border: none;
  color: #00fff2;
  font-weight: 700;
  cursor: pointer;
  font-size: 0.7rem;
}

.result-body {
  padding: 16px;
  font-size: 0.9rem;
  color: rgba(255,255,255,0.9);
  white-space: pre-wrap;
  max-height: 250px;
  overflow-y: auto;
  line-height: 1.6;
}

.image-result img {
  width: 100%;
  border-radius: 12px;
  margin-top: 20px;
  box-shadow: 0 15px 45px rgba(0,0,0,0.6);
}

.loading-text {
  animation: blink 1.5s infinite alternate;
}

@keyframes blink {
  from { opacity: 0.5; }
  to { opacity: 1; }
}

.panel-slide-enter-active, .panel-slide-leave-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.panel-slide-enter-from, .panel-slide-leave-to {
  opacity: 0;
  transform: translateY(30px) scale(0.9);
  filter: blur(15px);
}

.matting-upload-area {
  width: 100%;
  min-height: 140px;
  background: rgba(255, 255, 255, 0.02);
  border: 2px dashed rgba(0, 255, 242, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
  overflow: hidden;
  position: relative;
  margin-top: 8px;
  margin-bottom: 16px;
}

.matting-upload-area:hover {
  background: rgba(0, 255, 242, 0.05);
  border-color: rgba(0, 255, 242, 0.5);
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: rgba(255, 255, 255, 0.3);
}

.upload-placeholder span {
  font-size: 0.8rem;
}

.preview-img {
  max-width: 100%;
  max-height: 180px;
  object-fit: contain;
}

.matting-result {
  margin-top: 24px;
}

.result-box {
  background-image: 
    linear-gradient(45deg, #1a1a1a 25%, transparent 25%), 
    linear-gradient(-45deg, #1a1a1a 25%, transparent 25%), 
    linear-gradient(45deg, transparent 75%, #1a1a1a 75%), 
    linear-gradient(-45deg, transparent 75%, #1a1a1a 75%);
  background-size: 16px 16px;
  background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
  background-color: #0a0a0a;
  border-radius: 12px;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: 10px;
}

.result-box img {
  display: block;
  max-width: 100%;
  margin: 0 auto;
  border-radius: 4px;
  box-shadow: none;
}

.img-actions {
  margin-top: 16px;
  display: flex;
  justify-content: center;
  gap: 12px;
}

.download-link {
  display: inline-block;
  padding: 8px 16px;
  background: rgba(0, 255, 242, 0.1);
  border: 1px solid rgba(0, 255, 242, 0.4);
  border-radius: 8px;
  color: #00fff2;
  text-decoration: none;
  font-size: 0.75rem;
  font-weight: 600;
  transition: all 0.2s;
}

.download-link:hover {
  background: #00fff2;
  color: #0a0a14;
  box-shadow: 0 0 15px rgba(0, 255, 242, 0.4);
}
</style>
