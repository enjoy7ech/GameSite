/**
 * PhoneSystem 1.0 - 手机系统独立模块
 * 负责手机界面的所有逻辑渲染与交互，并同步至 GameState 以便保存
 */

/**
 * 此文件的功效，MCP
 * 
 * Define
 * 1. 手机界面
 * 2. 手机逻辑
 * 3. 手机状态
 * 
 * Skills
 * 1. 能够显示时间
 * 2. 能够显示日期
 * 3. 能够显示地点
 * 4. 能够显示天气
 * 5. 能够显示电量
 * 6. 能够显示信号
 * 7. 能够显示通知
 * 8. 能够显示消息
 * 9. 能够显示联系人
 */

export class PhoneSystem {
    constructor(engine) {
        this.engine = engine;
        this.gameState = engine.state;
        this.dom = {
            modal: document.getElementById('phone-modal-overlay'),
            homescreen: document.getElementById('phone-homescreen'),
            appMessages: document.getElementById('phone-app-messages'),
            msgList: document.getElementById('phone-msg-list'),
            body: document.querySelector('.phone-body'),
            screen: document.querySelector('.phone-screen'),
            homeBar: document.getElementById('phone-home-bar'),
            time: document.querySelector('.phone-time')
        };

        this.init();
    }

    init() {
        console.log("📱 Phone System Ready.");
        this.bindEvents();
    }

    bindEvents() {
        // Home 条点击：在 App 内回首页，在首页则关闭手机
        this.dom.homeBar.onclick = (e) => {
            e.stopPropagation();
            const isAtHome = !this.dom.homescreen.classList.contains('ui-mode-hide');
            if (isAtHome) {
                this.close();
            } else {
                this.switchApp('homescreen');
            }
        };

        // 桌面 App 图标事件
        this.dom.homescreen.querySelectorAll('.app-icon-item').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const app = btn.getAttribute('data-app');
                this.handleAppClick(app);
            };
        });
    }

    handleAppClick(app) {
        const unlocked = this.gameState.get('phone').unlockedApps;
        if (!unlocked.includes(app)) {
            alert('该App尚未解锁或正在维护中...');
            return;
        }

        switch (app) {
            case 'messages':
                this.switchApp('messages');
                break;
            case 'contacts':
                this.switchApp('contacts');
                break;
            case 'notes':
                this.switchApp('notes');
                break;
            case 'settings':
                this.switchApp('settings');
                break;
            case 'map':
                this.switchApp('map');
                break;
            case 'find':
                this.switchApp('find');
                break;
            default:
                alert('该App正在开发中...');
        }
    }

    open(startApp = 'homescreen') {
        const phoneState = this.gameState.get('phone');
        this.dom.modal.classList.remove('hidden');
        this.dom.modal.style.filter = `brightness(${(phoneState.settings.brightness || 100) / 100})`;
        this.updateHeaderTime();
        this.switchApp(startApp);
    }


    close() {
        this.dom.modal.classList.add('hidden');
    }

    updateHeaderTime() {
        if (this.dom.time) {
            this.dom.time.innerText = this.gameState.get('time');
        }
    }

    switchApp(appName) {
        // 先统一隐藏所有 App 容器
        const appViews = this.dom.body.querySelectorAll('.phone-app-view');
        appViews.forEach(v => v.classList.add('ui-mode-hide'));
        this.dom.homescreen.classList.add('ui-mode-hide');

        if (appName === 'homescreen') {
            this.dom.homescreen.classList.remove('ui-mode-hide');
            this.dom.screen.classList.remove('is-app-open');
        } else {
            this.dom.screen.classList.add('is-app-open');
            const targetApp = document.getElementById(`phone-app-${appName}`);
            if (targetApp) {
                targetApp.classList.remove('ui-mode-hide');
                this.renderAppContent(appName);
            } else {
                console.warn(`App view not found: phone-app-${appName}`);
                this.switchApp('homescreen');
            }
        }
    }

    renderAppContent(appName) {
        switch (appName) {
            case 'messages':
                this.renderMessages();
                break;
            case 'contacts':
                this.renderContacts();
                break;
            case 'notes':
                this.renderNotes();
                break;
            case 'settings':
                this.renderSettings();
                break;
            case 'map':
                this.engine.refreshMap(); // 调用刷新，避免从 showMap 重回 phoneSystem.open 引发死循环
                break;
            case 'find':
                this.renderFind();
                break;
        }
    }

    renderMessages() {
        this.dom.msgList.innerHTML = '';
        const msgs = this.gameState.getMessages();

        if (msgs.length === 0) {
            this.dom.msgList.innerHTML = '<div class="slot-empty">暂无新简讯</div>';
            return;
        }

        msgs.forEach(msg => {
            const item = document.createElement('div');
            item.className = `msg-item ${msg.isNew ? '' : 'read'}`;
            // 假设 registry 挂在 engine 上
            const senderConfig = (this.engine.registry && this.engine.registry.chars[msg.from]) || { name: msg.from };

            item.innerHTML = `
                <span class="msg-sender">${senderConfig.name}</span>
                <div class="msg-content">${msg.text}</div>
                <span class="msg-time">${msg.day} ${msg.time}</span>
            `;

            item.onclick = (e) => {
                e.stopPropagation();
                msg.isNew = false;
                item.classList.add('read');
                // 检查是否还有未读消息
                if (!msgs.some(m => m.isNew)) {
                    this.gameState.setFlag('has_unread_messages', false);
                    if (this.engine.updateHUD) this.engine.updateHUD();
                }
            };
            this.dom.msgList.appendChild(item);
        });
    }

    renderContacts() {
        const list = document.getElementById('contacts-main-list');
        const detailView = document.getElementById('contact-detail-view');
        if (!list || !detailView) return;

        // 隐藏详情，显示列表
        list.classList.remove('ui-mode-hide');
        detailView.classList.add('ui-mode-hide');

        list.innerHTML = '';
        
        // 遍历所有注册角色，找出“认识”的
        const allChars = this.engine.registry.chars;
        let metCount = 0;

        Object.entries(allChars).forEach(([cid, char]) => {
            const hasMet = (this.gameState.getFavor(cid) > 0) || (this.gameState.getFlag('met_' + cid));
            
            if (hasMet) {
                metCount++;
                const item = document.createElement('div');
                item.className = 'contact-item';
                item.innerHTML = `
                    <div class="contact-avatar" style="background-image: url('assets/${char.avatar}')"></div>
                    <div class="contact-name">${char.name}</div>
                `;
                item.onclick = (e) => {
                    e.stopPropagation();
                    this.showContactDetail(cid, char);
                };
                list.appendChild(item);
            }
        });

        if (metCount === 0) {
            list.innerHTML = '<div class="slot-empty">目前还没有保存任何联系人<br>(随着剧情推进邂逅更多人吧)</div>';
        }
    }

    showContactDetail(cid, char) {
        const list = document.getElementById('contacts-main-list');
        const detailView = document.getElementById('contact-detail-view');
        if (!list || !detailView) return;

        // 切换视图
        list.classList.add('ui-mode-hide');
        detailView.classList.remove('ui-mode-hide');

        // 绑定返回
        detailView.querySelector('.contact-back-btn').onclick = (e) => {
            e.stopPropagation();
            this.renderContacts();
        };

        // 填充基本信息
        detailView.querySelector('.contact-large-avatar').style.backgroundImage = `url('assets/${char.avatar}')`;
        detailView.querySelector('.contact-detail-name').innerText = char.name;
        detailView.querySelector('.contact-detail-bio').innerText = char.bio || "暂无详细简介。";

        // 渲染性格特质
        const traitsList = document.getElementById('contact-traits-list');
        traitsList.innerHTML = '';

        if (char.traits && char.traits.length > 0) {
            char.traits.forEach((trait, index) => {
                const isUnlocked = index === 0 || this.gameState.getFlag(`trait_${cid}_${trait.id}`);
                
                const traitEl = document.createElement('div');
                traitEl.className = `trait-item ${isUnlocked ? '' : 'locked'}`;
                
                if (isUnlocked) {
                    traitEl.innerHTML = `
                        <span class="trait-label">${trait.label}</span>
                        <p class="trait-desc">${trait.desc}</p>
                    `;
                } else {
                    traitEl.innerHTML = `
                        <span class="trait-label">？？？？</span>
                        <p class="trait-desc">继续加深羁绊以解锁此特质...</p>
                    `;
                }
                traitsList.appendChild(traitEl);
            });
        } else {
            traitsList.innerHTML = '<div class="slot-empty">尚无已知特质</div>';
        }
    }

    renderNotes() {
        const notesView = document.getElementById('phone-app-notes');
        if (!notesView) return;

        const list = notesView.querySelector('#phone-notes-list');
        if (!list) return;

        // 这里通常加载剧情中记录的线索
        const clues = this.gameState.get('phone').notes || [
            { title: "清风镇的起源", content: "关于这片土地古老的传说..." },
            { title: "那天的信", content: "信件似乎被藏在某个角落..." }
        ];

        list.innerHTML = `
            <div class="phone-notes-grid">
                ${clues.length === 0 ? '<div class="slot-empty">暂无记录</div>' : ''}
            </div>
        `;

        const grid = list.querySelector('.phone-notes-grid');
        clues.forEach(note => {
            const item = document.createElement('div');
            item.className = 'note-card';
            item.innerHTML = `
                <h4 class="note-title">${note.title}</h4>
                <p class="note-summary">${note.content}</p>
            `;
            grid.appendChild(item);
        });
    }

    renderSettings() {
        const settingsView = document.getElementById('phone-app-settings');
        if (!settingsView) return;

        const phoneState = this.gameState.get('phone');

        settingsView.innerHTML = `
            <div class="settings-group">
                <div class="settings-item">
                    <span>屏幕亮度</span>
                    <input type="range" id="phone-brightness" min="20" max="100" value="${phoneState.settings.brightness}">
                </div>
                <div class="settings-item">
                    <span>静音模式</span>
                    <button id="phone-silent-toggle" class="toggle-btn ${phoneState.settings.isSilent ? 'active' : ''}">
                        ${phoneState.settings.isSilent ? 'ON' : 'OFF'}
                    </button>
                </div>
                <div class="settings-item">
                    <span>OS版本</span>
                    <span class="settings-value">TinyOS 1.2</span>
                </div>
            </div>
            <div class="settings-info">
                Model: Antigravity-Note 7 (Premium Edition)
            </div>
        `;

        const brightnessInput = settingsView.querySelector('#phone-brightness');
        brightnessInput.oninput = (e) => {
            const val = parseInt(e.target.value);
            phoneState.settings.brightness = val;
            this.dom.modal.style.filter = `brightness(${val / 100})`;
        };

        const silentToggle = settingsView.querySelector('#phone-silent-toggle');
        silentToggle.onclick = (e) => {
            e.stopPropagation();
            phoneState.settings.isSilent = !phoneState.settings.isSilent;
            silentToggle.innerText = phoneState.settings.isSilent ? 'ON' : 'OFF';
            silentToggle.classList.toggle('active', phoneState.settings.isSilent);
        };
    }

    renderFind() {
        const findView = document.getElementById('phone-app-find');
        if (!findView) return;

        const list = findView.querySelector('#phone-inventory-list');
        if (!list) return;

        list.innerHTML = '';
        const inventory = this.gameState.get('inventory') || [];

        if (inventory.length === 0) {
            list.innerHTML = '<div class="slot-empty">目前还没有收集到任何物品</div>';
            return;
        }

        inventory.forEach(itemId => {
            const itemConfig = (this.engine.registry && this.engine.registry.items && this.engine.registry.items[itemId]) || {
                name: itemId,
                desc: '一件普通的物品。',
                icon: 'assets/items/default.webp'
            };

            const item = document.createElement('div');
            item.className = 'inventory-item';
            item.innerHTML = `
                <div class="item-icon">
                    <img src="${itemConfig.icon}" alt="${itemConfig.name}">
                </div>
                <div class="item-details">
                    <h4 class="item-name">${itemConfig.name}</h4>
                    <p class="item-desc">${itemConfig.desc}</p>
                </div>
            `;
            list.appendChild(item);
        });
    }
}
