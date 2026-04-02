/**
 * TinyFlow Engine 10.2 - Flat Sequential Drive
 * 适配：扁平化 story 数组结构
 */
import { gameState } from './state.js';
import { processGlobalEvents } from './event.js';
import { townMap } from './map.js';
import { TravelModal } from './components/TravelModal.js';
import { PhoneSystem } from './phone.js';

class TinyFlowEngine {
    constructor() {
        if (window.__tinyFlowEngine) return window.__tinyFlowEngine;

        this.story = null;
        this.registry = null;
        this.events = [];
        this.events = [];
        this.activeNode = null;
        this.frameIndex = 0;
        this.bgSuffix = ''; // 记录当前的时间/环境滤镜后缀

        // 不再自动读取游戏状态，交给玩家在系统菜单手动点击"读取"
        this.state = gameState; // 挂载到引擎方便访问实例

        this.dom = {
            bgLayer: document.getElementById('bg-layer'),
            itemOverlay: document.getElementById('item-overlay'),
            itemLayer: document.getElementById('item-layer'),
            ambientLayer: document.getElementById('ambient-narrative'),
            ambientText: document.querySelector('.ambient-text'),
            dialogueBox: document.getElementById('dialogue-panel'),
            speakerAvatar: document.getElementById('speaker-avatar'),
            speakerAside: document.querySelector('.speaker-aside'),
            plotText: document.querySelector('.plot-text'),
            plotOptions: document.getElementById('plot-options'),
            phoneTrigger: document.getElementById('phone-trigger'),
            messageTrigger: document.getElementById('message-trigger'),
            systemMenuOverlay: document.getElementById('system-menu-overlay'),
            mainMenuOptions: document.getElementById('main-menu-options'),
            slotView: document.getElementById('sys-slot-view'),
            slotList: document.getElementById('slot-list'),
            slotTitle: document.getElementById('slot-view-title'),
            phoneModal: document.getElementById('phone-modal-overlay'),
            phoneHomescreen: document.getElementById('phone-homescreen'),
            phoneAppMessages: document.getElementById('phone-app-messages'),
            phoneMsgList: document.getElementById('phone-msg-list'),
            phoneBody: document.querySelector('.phone-body'),
            phoneHomeBar: document.getElementById('phone-home-bar'),
            msgBadgeMain: document.getElementById('msg-badge-main'),
            mapContainer: document.getElementById('phone-app-map'),
            mapWorld: document.getElementById('map-world'),
            mapViewer: document.getElementById('map-viewer'),
            mapImg: document.getElementById('map-img'),
            mapPinsLayer: document.getElementById('map-pins-layer')
        };

        // --- 1. UI Components Initialization ---
        this.travelModal = new TravelModal(this.dom.mapContainer, {
            onConfirm: (data) => {
                // 状态变更：扣除耗时 + 更新位置
                this.state.dispatch({ func: "setLocation", params: [data.targetName] });
                this.updateHUD(); // 即使跳转了也先更新下顶栏信息

                // 彻底完成跳转后，关闭手机并恢复叙事
                this.closePhone();

                // 核心逻辑：防止主线剧情重复触发
                const pathNodeId = `d${this.state.get('day')}_path_${data.locKey.toLowerCase()}`;
                const visitedFlag = `visited_${pathNodeId}`;

                // 只有在该地点的首段剧情（Path）尚未触发过时才执行
                if (!this.state.getFlag(visitedFlag) && this.story.story.some(n => n.id === pathNodeId)) {
                    this.state.setFlag(visitedFlag, true);
                    this.runNode(pathNodeId);
                } else {
                    // 如果已经跑过主线，则进入“自由探索/事件判定”模式
                    if (!this.checkGlobalEvents()) {
                        // 如果连事件总线都没触发内容，则说明是常规探索。重置当前剧情节点到该地点的 Hub（如果有）或静默处理
                        console.log(`📍 Location [${data.targetName}] is idle.`);
                        // 核心加固：即便没新剧情，也得根据当前地点更新一下背景表现
                        this.renderCurrentFrame();
                    }
                }
            }
        });

        // --- Map Interaction State ---
        this.mapState = {
            scale: 1,
            x: 0,
            y: 0,
            isDragging: false,
            lastX: 0,
            lastY: 0
        };

        this.phoneSystem = new PhoneSystem(this);
        window.__tinyFlowEngine = this;
    }

    async init() {
        try {
            console.log("🎬 Engine 10.2 - Flat Data Driver Active.");
            const [storyRes, registryRes] = await Promise.all([
                fetch('./data/story.json'),
                fetch('./data/registry.json')
            ]);
            this.story = await storyRes.json();
            this.registry = await registryRes.json();

            this.bindEvents();

            // 初始节点
            this.runNode("d1_01_arrival");
            this.updateHUD();
        } catch (e) {
            console.error("Flat Manifest Load Error:", e);
        }
    }

    bindEvents() {
        const isVisible = (el) => {
            if (!el) return false;
            return !el.classList.contains('hidden') && !el.classList.contains('ui-mode-hide');
        };

        document.body.onclick = (e) => {
            console.log("👆 Click detected", {
                activeNode: this.activeNode?.id,
                frame: this.frameIndex,
                plotOptions: this.dom.plotOptions.innerHTML.trim().length,
                isMapVisible: isVisible(this.dom.mapContainer)
            });

            // 如果槽位视图、系统菜单、手机 modal 处于活跃并可见状态，则拦截并交给 UI 自己处理
            if (isVisible(this.dom.slotView) || isVisible(this.dom.systemMenuOverlay) || isVisible(this.dom.phoneModal)) {
                return;
            }

            // 2. 如果存在待选选项，拦截点击（由选项按钮自行处理逻辑）
            if (this.dom.plotOptions.innerHTML.trim() !== '') return;

            // 3. 基础安全检查
            if (!this.activeNode) {
                console.warn("⚠️ No active node, attempting recovery to arrival...");
                this.runNode("d1_01_arrival");
                return;
            }

            // 4. 放行主线推进
            this.nextFrame();
        };

        this.dom.phoneTrigger.onclick = (e) => { e.stopPropagation(); this.toggleSystemMenu(true); };
        this.dom.systemMenuOverlay.querySelector('.panel-close-btn').onclick = (e) => { e.stopPropagation(); this.toggleSystemMenu(false); };

        // 手机总入口：根据点击位置打开特定App或首页
        this.dom.messageTrigger.onclick = (e) => {
            e.stopPropagation();
            this.openPhone('homescreen');
        };

        this.dom.phoneHomeBar.onclick = (e) => {
            e.stopPropagation();
            const isAtHome = !this.dom.phoneHomescreen.classList.contains('ui-mode-hide');
            if (isAtHome) {
                this.closePhone(); // 在首页点击 Home Bar，彻底关闭并恢复叙事
            } else {
                this.switchPhoneApp('homescreen'); // 在 App 内点击 Home Bar，回首页
            }
        };

        // App 图标点击逻辑由 phone.js 接管
        // 不过我们也保留这里作为劫持入口，目前直接交给 phoneSystem 初始化内部事件即可


        // 游戏存档与读取 (Save/Load/Reset)
        document.getElementById('app-save').onclick = (e) => {
            e.stopPropagation();
            this.showSlotView('save');
        };

        document.getElementById('app-load').onclick = (e) => {
            e.stopPropagation();
            this.showSlotView('load');
        };

        document.getElementById('back-to-main').onclick = (e) => {
            e.stopPropagation();
            this.dom.mainMenuOptions.classList.remove('ui-mode-hide');
            this.dom.slotView.classList.add('ui-mode-hide');
        };

        document.getElementById('app-reset').onclick = (e) => {
            e.stopPropagation();
            if (confirm('确认要重新开始吗？这将抹除所有未保存的进度！')) {
                this.state.reset();
                this.updateHUD();
                this.runNode('d1_01_arrival');
                this.toggleSystemMenu(false);
            }
        };

        this.initMapControls();
    }

    initMapControls() {
        const world = this.dom.mapWorld;


        world.onwheel = (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.8 : 1.25; // 这里加大步幅，滚动更顺手
            const oldScale = this.mapState.scale;
            const newScale = Math.min(Math.max(0.2, oldScale * delta), 4);

            const rect = world.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            this.mapState.x = mouseX - (mouseX - this.mapState.x) * (newScale / oldScale);
            this.mapState.y = mouseY - (mouseY - this.mapState.y) * (newScale / oldScale);
            this.mapState.scale = newScale;

            this.updateMapTransform();
        };

        world.onpointerdown = (e) => {
            this.mapState.isDragging = true;
            this.mapState.lastX = e.clientX;
            this.mapState.lastY = e.clientY;
            world.style.cursor = 'grabbing';
            world.setPointerCapture(e.pointerId);
        };

        world.onpointermove = (e) => {
            if (!this.mapState.isDragging) return;

            // 采用偏移累加逻辑
            this.mapState.x += (e.clientX - this.mapState.lastX);
            this.mapState.y += (e.clientY - this.mapState.lastY);
            this.mapState.lastX = e.clientX;
            this.mapState.lastY = e.clientY;

            // 强制要求在下一帧执行渲染，避免触发过多重排
            if (!this.mapUpdatePending) {
                this.mapUpdatePending = true;
                requestAnimationFrame(() => {
                    this.updateMapTransform();
                    this.mapUpdatePending = false;
                });
            }
        };

        world.onpointerup = (e) => {
            if (!this.mapState.isDragging) return;
            this.mapState.isDragging = false;
            world.style.cursor = 'grab';
            world.releasePointerCapture(e.pointerId);
        };

        world.onpointercancel = (e) => {
            this.mapState.isDragging = false;
            world.style.cursor = 'grab';
            world.releasePointerCapture(e.pointerId);
        };
    }

    updateMapTransform() {
        const vw = this.dom.mapWorld.clientWidth;
        const vh = this.dom.mapWorld.clientHeight;
        const imgW = this.dom.mapImg.naturalWidth || 2752;
        const imgH = this.dom.mapImg.naturalHeight || 1536;

        // 1. 约束最小缩放，确保地图始终覆盖视口（不露黑边）
        const minScale = Math.max(vw / imgW, vh / imgH);
        if (this.mapState.scale < minScale) {
            this.mapState.scale = minScale;
        }

        // 2. 约束位移范围（不露黑边）
        const boundX = vw - imgW * this.mapState.scale;
        const boundY = vh - imgH * this.mapState.scale;

        this.mapState.x = Math.min(0, Math.max(boundX, this.mapState.x));
        this.mapState.y = Math.min(0, Math.max(boundY, this.mapState.y));

        this.dom.mapViewer.style.transform = `translate(${this.mapState.x}px, ${this.mapState.y}px) scale(${this.mapState.scale})`;
    }

    toggleSystemMenu(show) {
        this.dom.systemMenuOverlay.classList.toggle('hidden', !show);
        if (show) {
            this.dom.mainMenuOptions.classList.remove('ui-mode-hide');
            this.dom.slotView.classList.add('ui-mode-hide');
        }
    }

    showSlotView(mode) {
        this.dom.mainMenuOptions.classList.add('ui-mode-hide');
        this.dom.slotView.classList.remove('ui-mode-hide');
        this.dom.slotTitle.innerText = mode === 'save' ? "选择存档位置" : "选择读取存档";
        this.renderSlots(mode);
    }

    renderSlots(mode) {
        this.dom.slotList.innerHTML = '';
        const maxSlots = this.state.MAX_SLOTS || 10;

        for (let i = 1; i <= maxSlots; i++) {
            const info = this.state.getSlotInfo(i);
            const slotItem = document.createElement('div');
            slotItem.className = 'slot-item';

            if (info) {
                slotItem.innerHTML = `
                    <div class="slot-index">Slot ${i}</div>
                    <div class="slot-info">${info.location} - ${info.date} ${info.time}</div>
                    <div class="slot-meta">保存于: ${info.saveTime}</div>
                `;
            } else {
                slotItem.innerHTML = `
                    <div class="slot-index">Slot ${i}</div>
                    <div class="slot-empty">- 空白存档 -</div>
                `;
            }

            slotItem.onclick = (e) => {
                e.stopPropagation();
                if (mode === 'save') {
                    this.state.save(i);
                    alert(`进度已保存至 Slot ${i}`);
                    this.renderSlots('save'); // 刷新列表
                } else if (mode === 'load') {
                    if (this.state.load(i)) {
                        alert(`已读取 Slot ${i} 的进度`);
                        this.toggleSystemMenu(false);
                        this.updateHUD();
                        const savedNode = this.state.get('activeNodeId') || 'd1_01_arrival';
                        this.runNode(savedNode);
                    } else {
                        alert('读取失败：该存档位为空');
                    }
                }
            };

            this.dom.slotList.appendChild(slotItem);
        }
    }

    /**
     * 统一行动调度器：同时支持修改游戏状态(state)与调用引擎功能(UI/Logic)
     */
    dispatch(action) {
        if (!action || !action.func) return;

        // 1. 优先尝试执行数据状态变更
        if (typeof this.state[action.func] === 'function') {
            this.state.dispatch(action);
        }
        // 2. 否则尝试执行引擎自身的 UI 或逻辑控制
        else if (typeof this[action.func] === 'function') {
            try {
                this[action.func](...(action.params || []));
            } catch (err) {
                console.error(`❌ Engine action failed [${action.func}]:`, err);
            }
        } else {
            console.warn(`⚠️ Unknown command: ${action.func}`);
        }
    }

    dispatchActions(actions) {
        if (!Array.isArray(actions)) return;
        actions.forEach(a => this.dispatch(a));
        this.state.save();
    }

    showMapUI_force() {
        this.showMap();
    }

    runNode(nodeId) {
        const node = this.story.story.find(n => n.id === nodeId);

        if (!node) {
            console.warn(`Node ${nodeId} not found.`);
            this.showMap();
            return;
        }

        this.activeNode = node;
        this.frameIndex = 0;
        this.dom.plotOptions.innerHTML = '';
        this.state.setActiveNodeId(nodeId);

        this.renderCurrentFrame();
    }

    nextFrame() {
        if (!this.activeNode) return;

        const currentFrame = this.activeNode.display[this.frameIndex];
        if (currentFrame && currentFrame.result && currentFrame.result.length > 0) {
            this.dispatchActions(currentFrame.result);
            this.updateHUD();
        }

        this.frameIndex++;
        if (this.frameIndex < this.activeNode.display.length) {
            this.renderCurrentFrame();
            this.dom.dialogueBox.classList.remove('ui-mode-hide');
            this.dom.ambientLayer.classList.remove('ui-mode-hide');
        } else {
            if (this.dom.plotOptions.innerHTML === '') {
                if (this.activeNode.result && this.activeNode.result.length > 0) {
                    this.dispatchActions(this.activeNode.result);
                    this.updateHUD();
                }

                // 核心：若没有全局事件接手，则默认进入该地点的 Hub 而不是大地图
                if (!this.checkGlobalEvents()) {
                    // 如果我们已经在某个地点，且没有触发新剧情，不直接跳回地图
                    // 而是尝试触发 Hub (这由 event.js 里的 LOW 优先级事件处理)
                    // 如果连 Hub 都没有定义（event.js action 返回 false），则最后由 checkGlobalEvents 的兜底逻辑（如果有的话）或者这里处理
                    this.showMap();
                }
            }
        }
    }

    renderCurrentFrame() {
        const frames = this.activeNode.display || [];
        const frame = frames[this.frameIndex];
        
        // 关键逻辑：确保剧情推进不会因为当前节点跑到头而没画面更新
        if (!frame) {
            this.dom.dialogueBox.classList.add('hidden');
            this.updateBackgroundOnly(); // 自定义方法：只同步当前地点对应的背景
            return;
        }

        // 确保 UI 面板可见
        this.dom.dialogueBox.classList.remove('ui-mode-hide');
        this.dom.ambientLayer.classList.remove('ui-mode-hide');

        // 1. 背景同步
        if (frame.screen && frame.screen.pic) {
            // 解析原本的名字（去掉可能已经手动带上的后缀以防重复叠加）
            const basePic = frame.screen.pic.replace(/(_sunset|_night)$/, '');
            const finalPic = this.bgSuffix ? `${basePic}${this.bgSuffix}` : basePic;

            // 只有当图片真的改变时才重新设定背景，防止因为同图复用导致的闪烁动画
            const newUrl = `url('./assets/${finalPic}.webp')`;
            if (this.dom.bgLayer.style.backgroundImage !== newUrl) {
                this.dom.bgLayer.style.backgroundImage = newUrl;
            }
        }

        // 2. 环境文字
        if (frame.screen && frame.screen.text) {
            this.dom.ambientLayer.classList.remove('hidden');
            this.dom.ambientText.innerHTML = frame.screen.text;
        } else {
            this.dom.ambientLayer.classList.add('hidden');
        }

        // 📝 物件展示层 (New System)
        if (frame.screen && frame.screen.item) {
            this.dom.itemLayer.src = `./assets/items/${frame.screen.item}.webp`;
            this.dom.itemOverlay.classList.remove('hidden');
        } else {
            this.dom.itemOverlay.classList.add('hidden');
        }

        // 3. 对话与人像同步
        if (frame.dialog && frame.dialog.text) {
            this.dom.dialogueBox.classList.remove('hidden');
            this.dom.plotText.innerHTML = frame.dialog.text;

            // --- AVATAR RENDERING (PIC PRIORITY) ---
            if (frame.dialog.char && frame.dialog.char !== "none") {
                // 核心：优先使用显式指定的 pic 资源名，否则降级使用 char 标识符
                let assetId = (frame.dialog.pic || frame.dialog.char).toLowerCase();

                if (assetId === "野") assetId = "protagonist";
                if (assetId === "海生") assetId = "kaisheng";
                if (assetId === "原野") assetId = "haruno";

                const avatarPath = `./assets/char/${assetId}.webp`;
                this.dom.speakerAvatar.src = avatarPath;
                this.dom.speakerAvatar.classList.remove('hidden');
                this.dom.speakerAside.classList.remove('hidden');

                // --- 核心增强：未邂逅角色灰影化 (Grey Silhouette for unmet NPCs) ---
                const isProtagonist = (assetId === "protagonist" || frame.dialog.char === "野");
                // 判定基准：只要好感度大于 0，或者显式标记了 'met_角色名'，即视为见过
                const hasMet = this.state.getFavor(assetId) > 0 || this.state.getFlag('met_' + assetId);

                if (!isProtagonist && !hasMet) {
                    this.dom.speakerAvatar.classList.add('png-gray-silhouette');
                } else {
                    this.dom.speakerAvatar.classList.remove('png-gray-silhouette');
                }

                // 统一置右逻辑 (由于野是唯一主角，始终保留其右侧权益)
                if (isProtagonist) {
                    this.dom.speakerAside.classList.add('is-self');
                } else {
                    this.dom.speakerAside.classList.remove('is-self');
                }
            } else {
                this.dom.speakerAvatar.classList.add('hidden');
                this.dom.speakerAside.classList.add('hidden');
            }
        } else {
            this.dom.dialogueBox.classList.add('hidden');
        }

        // 4. 选择分支
        if (frame.choice && frame.choice.length > 0) {
            this.renderFrameChoices(frame.choice);
        }
    }

    renderFrameChoices(choices) {
        this.dom.plotOptions.innerHTML = '';
        choices.forEach(ch => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.innerText = ch.label;
            btn.onclick = (e) => {
                e.stopPropagation();
                this.dom.plotOptions.innerHTML = '';

                // 1. 先结算当前分镜 (Frame级别) 的 actions
                const currentFrame = this.activeNode.display[this.frameIndex];
                if (currentFrame && currentFrame.result && currentFrame.result.length > 0) {
                    this.dispatchActions(currentFrame.result);
                }

                // 2. 执行完成当前剧情 (Node级别) 设定的 actions
                if (this.activeNode.result && this.activeNode.result.length > 0) {
                    this.dispatchActions(this.activeNode.result);
                }

                // 3. 执行你刚才点击的选项 (Choice级别) 设定的 actions
                if (ch.result && ch.result.length > 0) {
                    this.dispatchActions(ch.result);
                }

                // Because there's state transition, update UI
                this.updateHUD();

                // 4. Scripted Target Priority
                // If the choice has a target, we GO there. No dynamic hijacking unless it's a force-interjection system (which should be handled inside runNode or after).
                if (ch.target) {
                    this.runNode(ch.target);
                    return;
                }

                // Only if no target (meaning we intended to go back to map/idle) do we allow global events to intercept.
                if (this.checkGlobalEvents()) return;

                this.showMap();
            };
            this.dom.plotOptions.appendChild(btn);
        });
    }

    showMap() {
        // --- 核心优化：地图现在是以手机 App 形式存在 ---
        this.phoneSystem.open('map');

        this.dom.dialogueBox.classList.add('ui-mode-hide');
        this.dom.ambientLayer.classList.add('ui-mode-hide');
    }

    /**
     * 核心：刷新地图视口
     * 该方法会在被 switchApp('map') 调用时执行。
     */
    refreshMap() {
        // 关键修复：确保在 DOM 彻底显示（clientWidth 不为 0）后再进行位置计算
        requestAnimationFrame(() => {
            if (this.mapInitialized) {
                this.centerMapOnCurrent();
                this.renderPins();
                return;
            }

            const init = () => {
                const imgW = this.dom.mapImg.naturalWidth || 2752;
                const imgH = this.dom.mapImg.naturalHeight || 1536;

                const vw = this.dom.mapWorld.clientWidth;
                const vh = this.dom.mapWorld.clientHeight;

                // 核心加固：默认以“填满高度或宽度的 2.0 倍”作为初始放大倍率 (此时更清晰)
                const minScale = Math.max(vw / imgW, vh / imgH);
                this.mapState.scale = minScale * 2.0;

                this.dom.mapViewer.style.width = imgW + 'px';
                this.dom.mapViewer.style.height = imgH + 'px';

                this.centerMapOnCurrent(); // 统一调用居中逻辑
                this.renderPins();
                this.mapInitialized = true; // 记录初始化状态
            };

            if (this.dom.mapImg.complete && this.dom.mapImg.naturalWidth > 0) {
                init();
            } else {
                this.dom.mapImg.onload = init;
                this.dom.mapImg.onerror = init;
            }
        });
    }

    /**
     * 自动将地图视角中心对准玩家当前位置
     */
    centerMapOnCurrent() {
        const world = this.story.world || {};
        const currentLocName = this.state.get('location') || "清风站";

        let currentCoords = null;
        for (const [locKey, [x, y]] of Object.entries(world)) {
            const config = this.registry.locations[locKey] || { name: locKey };
            if (config.name === currentLocName || (config.alias && config.alias.includes(currentLocName))) {
                currentCoords = { x, y };
                break;
            }
        }

        const vw = this.dom.mapWorld.clientWidth || window.innerWidth;
        const vh = this.dom.mapWorld.clientHeight || window.innerHeight;
        const imgW = this.dom.mapImg.naturalWidth || 2752;
        const imgH = this.dom.mapImg.naturalHeight || 1536;
        const scale = this.mapState.scale;

        if (currentCoords) {
            // 算法：屏幕中心减去目标点的缩放位置
            this.mapState.x = (vw / 2) - ((currentCoords.x / 1000) * imgW * scale);
            this.mapState.y = (vh / 2) - ((currentCoords.y / 1000) * imgH * scale);

            // 修正：确保居中时也不要露出黑边
            this.updateMapTransform();
        } else {
            // 兜底：居中整张地图
            this.mapState.x = (vw - imgW * scale) / 2;
            this.mapState.y = (vh - imgH * scale) / 2;
        }
        this.updateMapTransform();
    }

    renderPins() {
        if (!this.dom.mapPinsLayer) return;
        this.dom.mapPinsLayer.innerHTML = '';

        const world = this.story.world || {};
        const currentLocName = this.state.get('location') || "清风站";

        Object.entries(world).forEach(([locKey, [x, y]]) => {
            const config = this.registry.locations[locKey] || { name: locKey };
            const pin = document.createElement('div');
            pin.className = 'map-pin';

            const isCurrent = config.name === currentLocName || (config.alias && config.alias.includes(currentLocName));
            if (isCurrent) pin.classList.add('is-current');

            const iconKey = locKey.toLowerCase();
            pin.innerHTML = `<img src="./assets/ui/icons/${iconKey}.webp" alt="${locKey}">`;
            pin.style.left = `${(x / 1000) * 100}%`;
            pin.style.top = `${(y / 1000) * 100}%`;

            if (!isCurrent) {
                pin.onclick = (e) => {
                    e.stopPropagation();
                    this.showTravelConfirm(locKey);
                };
            }

            pin.onpointerdown = (e) => e.stopPropagation();
            this.dom.mapPinsLayer.appendChild(pin);
        });
    }

    /**
     * 通过地点反查配置数据
     * @param {string} locName 
     */
    findLocationConfigByName(locName) {
        return Object.values(this.registry.locations).find(l =>
            l.name === locName || (l.alias && l.alias.includes(locName))
        );
    }

    /**
     * 组件化显示行程确认弹窗
     * @param {string} locKey 对应 story.world 中的 Key (如 "Station")
     */
    showTravelConfirm(locKey) {
        const config = this.registry.locations[locKey];
        const targetName = config ? config.name : locKey;
        const currentLocName = this.state.get('location') || "清风站";
        const timeCost = townMap.calculateTravelTime(currentLocName, targetName);

        // --- 2. 显示组件 ---
        this.travelModal.show({ targetName, timeCost, locKey });
    }

    /**
     * 巡查全局事件并决断是否由于满足条件截停当前的游戏管线跳转到强制剧情
     * (已经将逻辑托管到专用的 event.js 模块中编写，替代僵化的 JSON 配置)
     * @returns {boolean} 是否劫持成功
     */
    checkGlobalEvents() {
        return processGlobalEvents(this);
    }

    /**
     * 设置环境底图滤镜后缀 (如 "_sunset" 或 "_night")，并在游戏渲染管线中自动生效
     */
    setGlobalBgSuffix(suffix) {
        if (this.bgSuffix !== suffix) {
            this.bgSuffix = suffix;
            // 强制重新渲染当前帧的背景图
            if (this.activeNode && this.activeNode.display[this.frameIndex]) {
                const frame = this.activeNode.display[this.frameIndex];
                if (frame.screen && frame.screen.pic) {
                    const basePic = frame.screen.pic.replace(/(_sunset|_night)$/, '');
                    this.dom.bgLayer.style.backgroundImage = `url('./assets/${basePic}${this.bgSuffix}.webp')`;
                }
            }
        }
    }

    /**
     * 系统菜单显隐控制
     */
    toggleSystemMenu(show) {
        if (show) {
            this.dom.systemMenuOverlay.classList.remove('hidden');
            this.dom.slotView.classList.add('ui-mode-hide');
            this.dom.mainMenuOptions.classList.remove('ui-mode-hide');
            this.updateHUD(); // 打开菜单时刷新下状态
        } else {
            this.dom.systemMenuOverlay.classList.add('hidden');
        }
    }

    /**
     * 手机系统核心切换逻辑 (已委托给 PhoneSystem)
     */
    openPhone(startApp) {
        this.phoneSystem.open(startApp);
    }

    closePhone() {
        this.phoneSystem.close();
        this.dom.dialogueBox.classList.remove('ui-mode-hide');
        this.dom.ambientLayer.classList.remove('ui-mode-hide');
        this.renderCurrentFrame();
    }

    switchPhoneApp(appName) {
        this.phoneSystem.switchApp(appName);
    }


    renderMessages() {
        this.phoneSystem.renderMessages();
    }


    updateHUD() {
        // 更新主界面手机简讯小红点
        if (this.dom.msgBadgeMain) {
            if (this.state.getFlag('has_unread_messages')) {
                this.dom.msgBadgeMain.classList.remove('hidden');
            } else {
                this.dom.msgBadgeMain.classList.add('hidden');
            }
        }
    }

    updateBackgroundOnly() {
        // 根据当前所处位置和时间段，兜底渲染背景图
        const location = this.state.get('location') || '主角房间';
        const locMap = {
            '主角房间': 'bg_room_day',
            '码头': 'bg_river_day',
            '风月书屋': 'bg_town_day',
            '清风站': 'bg_station_day'
        };
        const bg = locMap[location] || 'bg_town_day';
        const finalBg = this.bgSuffix ? `${bg}${this.bgSuffix}` : bg;
        this.dom.bgLayer.style.backgroundImage = `url('./assets/${finalBg}.webp')`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TinyFlowEngine().init();
});
