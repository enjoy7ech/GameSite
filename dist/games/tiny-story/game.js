/**
 * TINY STORY - Core Game Engine (V10 - Final Iteration)
 * A massive, multi-branched narrative project with 7-day structure, 
 * character stats, inventory, and dynamic pathing.
 */

const TinyStory = {
    state: {
        currentNode: 'start',
        day: 1,
        time: 'Morning', // Morning, Afternoon, Evening
        stats: {
            sens: 0, 
            obs: 0,
            charm: 0,
            bond_haruno: 0,
            bond_lin: 0,
            bond_aoi: 0,
            bond_kaisheng: 0
        },
        inventory: [],
        achievements: []
    },

    // --- 故事库 ---
    storyNodes: {
        // [Day 1: 清晨]
        'start': {
            speaker: "旁白",
            text: "清晨的阳光斜斜地洒在『风亮小站』。这是你回到清风镇的第一天，蝉鸣声已经开始躁动了。",
            next: 'd1_morning_choice'
        },
        'd1_morning_choice': {
            speaker: "你自己",
            text: "姑姑还没回来。趁着早晨空气凉爽，我想先去：",
            options: [
                { text: "书店帮工", nextNode: 'd1_bookstore', action: () => TinyStory.addStat('obs', 5) },
                { text: "街头闲逛", nextNode: 'd1_station', action: () => TinyStory.addStat('sens', 5) },
                { text: "潮汐咖啡馆", nextNode: 'd1_cafe', action: () => TinyStory.addStat('charm', 5) },
                { text: "旧码头吹风", nextNode: 'd1_dock', action: () => TinyStory.addStat('sens', 10) }
            ]
        },

        // 书店路径 (D1)
        'd1_bookstore': {
            speaker: "林老师",
            text: "喔，老张家的孙子回来了。正好，帮我找出一张三十年前的旧照片。",
            options: [
                { text: "发现花签照片", nextNode: 'd1_discovery', action: () => TinyStory.addItem('栀子花签') },
                { text: "认真整理书籍", nextNode: 'd1_work', action: () => TinyStory.addStat('bond_lin', 5) }
            ]
        },
        'd1_discovery': {
            speaker: "旁白",
            text: "你在一本《清风志》中发现了『栀子花签』。林老师似乎没注意到。 (解锁成就: 敏锐观察者)",
            action: () => TinyStory.unlockAchievement('敏锐观察者'),
            next: 'd1_afternoon_transition'
        },
        'd1_work': {
            speaker: "林老师",
            text: "干得不错，小野。现在的年轻人很少有这么静得下心的了。 (好感 +5)",
            next: 'd1_afternoon_transition'
        },

        // 车站/原野路径 (D1)
        'd1_station': {
            speaker: "？？？",
            text: "嘿！那个拿单反的，别光顾着拍电车，过来帮把手！",
            next: 'd1_haruno_intro'
        },
        'd1_haruno_intro': {
            speaker: "少女",
            text: "我是原野，正准备去后山涂鸦，但这台自行车的链条太调皮了。能修修吗？",
            options: [
                { text: "展现硬核手工活", nextNode: 'd1_haruno_happy', action: () => TinyStory.addStat('bond_haruno', 15) },
                { text: "只是礼貌推一把", nextNode: 'd1_haruno_neutral', action: () => TinyStory.addStat('bond_haruno', 5) }
            ]
        },
        'd1_haruno_happy': {
            speaker: "原野",
            text: "漂亮！你这人很有意思嘛。下午要是没事，来后山找我，我有好东西给你看。",
            next: 'd1_afternoon_transition'
        },

        // 咖啡路径 (D1)
        'd1_cafe': {
            speaker: "葵姐姐",
            text: "早安，小野。要来一杯特制的『落日拿铁』吗？这是店里的赠品哦。",
            options: [
                { text: "接受冰拿铁", nextNode: 'd1_cafe_got', action: () => TinyStory.addItem('特制拿铁') },
                { text: "点一杯清茶", nextNode: 'd1_cafe_tea' }
            ]
        },
        'd1_cafe_got': {
            speaker: "葵姐姐",
            text: "拿着它吧，清风镇的夏天很长。 (获得关键补给)",
            next: 'd1_afternoon_transition'
        },

        // [Day 1: 午后 - 动态转移]
        'd1_afternoon_transition': {
            speaker: "旁白",
            text: "午后的阳光变得毒辣。小镇街道上空无一人。你想...",
            action: () => TinyStory.checkD1Afternoon()
        },
        
        // 动态路径: 后山约会 (如果修了车)
        'd1_mountain_haruno': {
            speaker: "原野",
            text: "你真的来了。看这面墙，这是我的秘密基地。我想在这里画一朵从未见过的花。",
            options: [
                { text: "建议画栀子花", nextNode: 'd1_haruno_secret', action: () => TinyStory.addStat('sens', 10) },
                { text: "只是静静地看她画", nextNode: 'd1_haruno_silent' }
            ]
        },
        'd1_haruno_secret': {
            speaker: "原野",
            text: "栀子花？那是这里的镇花吧。不过……总觉得你话里有话。明天再见咯。 (好感 +10)",
            next: 'd1_evening'
        },

        // [Day 1: 入夜]
        'd1_evening': {
            speaker: "旁白",
            text: "夜深了。第一天的故事画上了句号。蝉鸣逐渐微弱。 (准备进入 Day 2)",
            options: [{ text: "休息并保存进度", nextNode: 'd2_morning_start' }]
        },

        // [Day 2: 清晨]
        'd2_morning_start': {
            speaker: "旁白",
            text: "第二天，果然如天气预报所说，小镇被一场突如其来的骤雨笼罩了。",
            action: () => TinyStory.checkDay2Branch()
        },
        
        // 分支: 书库秘辛 (如果第一天拿了花签)
        'd2_secret_library': {
            speaker: "林老师",
            text: "既然你发现了那朵花，或许我们该去书店最底层的旧仓库看看。那里一直没有钥匙。",
            options: [
                { text: "跟随林老师探索", nextNode: 'd2_library_mystery' },
                { text: "独自去码头躲雨", nextNode: 'd1_dock' }
            ]
        },
        'd2_library_mystery': {
            speaker: "林老师",
            text: "这里尘封了三十年。看那张照片，和你昨天看到的是同一个人。她曾经就在这里...",
            next: 'start' // 循环回开始或前往结局
        }
    },

    // --- 逻辑处理 ---
    init: function() {
        this.cacheElements();
        this.bindEvents();
        this.renderNode();
        console.log("Tiny Story V10 Ultimate Initialized");
    },

    cacheElements: function() {
        this.els = {
            startScreen: document.getElementById('start-screen'),
            playScreen: document.getElementById('play-screen'),
            btnStart: document.getElementById('btn-start'),
            dialoguePanel: document.getElementById('dialogue-panel'),
            speakerTag: document.querySelector('.speaker-tag'),
            dialogueContent: document.querySelector('.dialogue-content'),
            dialogueFooter: document.querySelector('.dialogue-footer')
        };
    },

    bindEvents: function() {
        this.els.btnStart.addEventListener('click', () => this.startGame());
        this.els.dialoguePanel.addEventListener('click', (e) => {
            if (e.target.classList.contains('option-btn')) return;
            this.handlePanelClick();
        });
    },

    addStat: function(key, val) {
        this.state.stats[key] += val;
        this.notify(`[属性增加] ${key.toLocaleUpperCase()} +${val}`);
    },

    addItem: function(item) {
        this.state.inventory.push(item);
        this.notify(`[获得物品] ${item}`);
    },

    unlockAchievement: function(name) {
        if (!this.state.achievements.includes(name)) {
            this.state.achievements.push(name);
            this.notify(`[达成成就] 🏆 ${name}`);
        }
    },

    notify: function(msg) {
        console.log(msg);
        const toast = document.createElement('div');
        toast.className = 'game-toast';
        toast.innerText = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    },

    startGame: function() {
        this.els.startScreen.classList.remove('active');
        this.els.playScreen.classList.add('active');
        this.renderNode();
    },

    handlePanelClick: function() {
        const node = this.storyNodes[this.state.currentNode];
        if (node.next && !node.options) {
            this.state.currentNode = node.next;
            this.renderNode();
        }
    },

    // 动态路径计算: 第1天下午
    checkD1Afternoon: function() {
        if (this.state.stats.bond_haruno >= 15) {
            this.state.currentNode = 'd1_mountain_haruno';
        } else {
            this.state.currentNode = 'd1_evening';
        }
        this.renderNode();
    },

    // 动态路径计算: 第2天早晨
    checkDay2Branch: function() {
        if (this.state.inventory.includes('栀子花签')) {
            this.state.currentNode = 'd2_secret_library';
        } else {
            this.state.currentNode = 'd1_evening'; // 兜底返回
        }
        this.renderNode();
    },

    renderNode: function() {
        const node = this.storyNodes[this.state.currentNode];
        if (!node) return;

        this.els.speakerTag.innerText = node.speaker || "旁白";
        this.typeText(this.els.dialogueContent, node.text);
        
        this.els.dialogueFooter.innerHTML = "";
        
        if (node.options) {
            const container = document.createElement('div');
            container.className = 'options-container';
            node.options.forEach(opt => {
                const btn = document.createElement('button');
                btn.className = 'option-btn';
                btn.innerText = opt.text;
                btn.onclick = (e) => {
                    e.stopPropagation();
                    if (opt.action) opt.action();
                    this.state.currentNode = opt.nextNode;
                    this.renderNode();
                };
                container.appendChild(btn);
            });
            this.els.dialogueFooter.appendChild(container);
        } else if (node.next) {
            const hint = document.createElement('span');
            hint.className = 'click-text';
            hint.innerText = "点击继续故事...";
            this.els.dialogueFooter.appendChild(hint);
        }
    },

    typeText: function(element, text) {
        element.innerText = "";
        let i = 0;
        if (this.typingTimer) clearInterval(this.typingTimer);
        this.typingTimer = setInterval(() => {
            if (i < text.length) {
                element.innerText += text.charAt(i);
                i++;
            } else {
                clearInterval(this.typingTimer);
            }
        }, 20);
    }
};

window.onload = () => TinyStory.init();
