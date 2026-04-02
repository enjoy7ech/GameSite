/**
 * 游戏全局状态管理器 (State Manager)
 * 负责保存/读取游戏，并提供显式的方法来修改状态。
 */

/**
 * 此文件的功效，MCP
 * 
 * Define
 * 1. 游戏状态
 * 2. 游戏数据
 * 3. 游戏进度
 * 
 * Skills
 * 1. 能够保存游戏
 * 2. 能够读取游戏
 * 3. 能够重置游戏
 * 4. 能够获取游戏状态
 * 5. 能够设置游戏状态
 */

import { townMap } from './map.js';

export class GameState {
    constructor() {
        this.STORAGE_KEY = 'tinystory_save_v1.1';
        this.SLOT_PREFIX = 'tinystory_slot_';
        this.MAX_SLOTS = 10;
        this.reset();
    }

    /**
     * 重置为初始新游戏状态
     */
    reset() {
        this.data = {
            activeNodeId: "d1_01_arrival",
            day: 1,
            date: "8月12日",
            time: "08:00",
            location: "清风站",
            inventory: [],  // 玩家所持物品ID集合

            // 角色基础属性
            stats: {
                Obs: 10,  // 观察力
                Sens: 10  // 感性
            },

            // 角色好感度 (玩家对角色)
            favor: {
                haruno: 0,   // 原野
                mrlin: 0,    // 林老师
                aoi: 0,      // 葵
                kaisheng: 0, // 海生
                auntie: 0    // 姑姑
            },

            // 角色间好感度 (NPC 对 NPC/玩家)
            // 格式: { "charA": { "charB": 50, "player": 20 } }
            relationships: {},

            // 剧情标记 (如已相遇、已发现某事等)
            flags: {},

            // 手机信息系统 (Received SMS)
            messages: [],

            // 手机系统扩展状态 (Saved Phone State)
            phone: {
                wallpaper: "default",
                unlockedApps: ["messages", "contacts", "gallery", "phone", "notes", "map", "settings", "find"],
                contacts: [], // 已存联系人
                callHistory: [], // 通话记录
                notes: [], // 剧情线索记录
                settings: {
                    brightness: 100,
                    volume: 80,
                    isSilent: false
                }
            }
        };
    }

    /**
     * 保存状态至指定的存档槽位 (LocalStorage)
     */
    save(slot = 0) {
        try {
            this.data.lastSaved = Date.now();
            this.data.saveDateStr = new Date().toLocaleString();
            const key = slot === 0 ? this.STORAGE_KEY : `${this.SLOT_PREFIX}${slot}`;
            localStorage.setItem(key, JSON.stringify(this.data));
            console.log(`💾 槽位 ${slot} 已保存`);
        } catch (e) {
            console.error("保存失败:", e);
        }
    }

    /**
     * 从指定的存档槽位读取状态
     */
    load(slot = 0) {
        try {
            const key = slot === 0 ? this.STORAGE_KEY : `${this.SLOT_PREFIX}${slot}`;
            const saved = localStorage.getItem(key);
            if (saved) {
                const parsed = JSON.parse(saved);
                this.data = {
                    ...this.data,
                    ...parsed,
                    stats: { ...this.data.stats, ...(parsed.stats || {}) },
                    favor: { ...this.data.favor, ...(parsed.favor || {}) },
                    flags: { ...this.data.flags, ...(parsed.flags || {}) },
                    phone: { ...this.data.phone, ...(parsed.phone || {}) }
                };
                console.log(`📂 槽位 ${slot} 已读取`);
                return true;
            }
        } catch (e) {
            console.error("读取保存失败:", e);
        }
        return false;
    }

    /**
     * 获取指定槽位的预览信息 (用于 UI 显示)
     */
    getSlotInfo(slot) {
        const key = slot === 0 ? this.STORAGE_KEY : `${this.SLOT_PREFIX}${slot}`;
        const saved = localStorage.getItem(key);
        if (!saved) return null;
        try {
            const parsed = JSON.parse(saved);
            return {
                location: parsed.location || "未知地点",
                time: parsed.time || "??:??",
                date: parsed.date || "8月??日",
                saveTime: parsed.saveDateStr || "未知时间"
            };
        } catch (e) {
            return null;
        }
    }

    /**
     * 清除存档
     */
    clearSave() {
        localStorage.removeItem(this.STORAGE_KEY);
        this.reset();
    }

    // ==========================================
    // 状态读取辅助
    // ==========================================
    get(key) { return this.data[key]; }
    getStat(key) { return this.data.stats[key] || 0; }
    getFavor(charId) { return this.data.favor[charId] || 0; }
    getFlag(flagId) { return !!this.data.flags[flagId]; }
    hasItem(itemId) { return this.data.inventory.includes(itemId); }

    // ==========================================
    // 状态修改库 (对应 story 数据中的 func)
    // 供引擎调用 Action 的具体函数实现
    // 例如: { func: "modifyFavor", params: ["haruno", 15] }
    // ==========================================

    setTime(timeStr) {
        this.data.time = timeStr;
    }

    /**
     * 增加指定的时间（分钟），自动处理小时进位与跨天
     * @param {number} minutesToAdd
     */
    addTime(minutesToAdd) {
        if (!this.data.time || typeof minutesToAdd !== 'number') return;

        let [hours, minutes] = this.data.time.split(':').map(Number);
        minutes += minutesToAdd;

        // 计算进位
        hours += Math.floor(minutes / 60);
        minutes = minutes % 60;

        // 处理跨天（过午夜）
        if (hours >= 24) {
            const daysPassed = Math.floor(hours / 24);
            hours %= 24;
            this.setDay(this.data.day + daysPassed);
        }

        // 格式化回 HH:mm
        const formatH = hours.toString().padStart(2, '0');
        const formatM = minutes.toString().padStart(2, '0');

        this.data.time = `${formatH}:${formatM}`;
        console.log(`⏰ 时间流逝: +${minutesToAdd}分钟 (当前: 第${this.data.day}天 ${this.data.time})`);
    }

    setDate(dateStr) {
        this.data.date = dateStr;
    }

    setDay(dayNum) {
        this.data.day = dayNum;
    }

    /**
     * 设置地点，并触发动态大地图位置耗时计算
     * @param {string} locName 目标地点
     * @param {boolean} skipTime 是否强制跳过耗时环节（瞬间移动）
     */
    setLocation(locName, skipTime = false) {
        if (this.data.location === locName) return;

        // 自动计算并扣除寻路时间
        if (!skipTime && this.data.location) {
            const costMinutes = townMap.calculateTravelTime(this.data.location, locName);
            if (costMinutes > 0) {
                console.log(`🗺️ 移动计算: ${this.data.location} -> ${locName}`);
                this.addTime(costMinutes);
            }
        }

        this.data.location = locName;
    }

    modifyStat(statName, value) {
        if (this.data.stats[statName] !== undefined) {
            this.data.stats[statName] += value;
            console.log(`📈 属性 [${statName}] 发生变动: ${value > 0 ? '+' : ''}${value} (当前: ${this.data.stats[statName]})`);
        }
    }

    modifyFavor(charId, value) {
        if (this.data.favor[charId] !== undefined) {
            this.data.favor[charId] += value;
            console.log(`💖 角色 [${charId}] 对玩家好感度变动: ${value > 0 ? '+' : ''}${value} (当前: ${this.data.favor[charId]})`);
        }
    }

    /**
     * 修改角色间的好感度
     * @param {string} fromChar 发出好感的角色 ID
     * @param {string} toChar 接收好感的角色 ID (可以是 'player')
     * @param {number} value 增加/减少的数值
     */
    modifyRelationship(fromChar, toChar, value) {
        if (!this.data.relationships[fromChar]) {
            this.data.relationships[fromChar] = {};
        }
        const current = this.data.relationships[fromChar][toChar] || 0;
        this.data.relationships[fromChar][toChar] = current + value;
        console.log(`🎭 关系网变动: ${fromChar} -> ${toChar} [${value > 0 ? '+' : ''}${value}] (当前: ${this.data.relationships[fromChar][toChar]})`);
    }

    getRelationship(fromChar, toChar) {
        if (toChar === 'player') return this.getFavor(fromChar);
        return (this.data.relationships[fromChar] && this.data.relationships[fromChar][toChar]) || 0;
    }

    setFlag(flagId, booleanValue) {
        this.data.flags[flagId] = booleanValue;
        console.log(`🚩 标记触达: [${flagId}] = ${booleanValue}`);
    }

    addItem(itemId) {
        if (!this.data.inventory.includes(itemId)) {
            this.data.inventory.push(itemId);
            console.log(`🎒 获得物品: ${itemId}`);
        }
    }

    removeItem(itemId) {
        this.data.inventory = this.data.inventory.filter(i => i !== itemId);
        console.log(`🗑️ 失去物品: ${itemId}`);
    }

    setActiveNodeId(nodeId) {
        this.data.activeNodeId = nodeId;
    }

    /**
     * 接收来自 NPC 的手机简讯
     * @param {string} fromCharId 发送者 ID
     * @param {string} content 内容
     */
    receiveMessage(fromCharId, content) {
        const msg = {
            id: `msg_${Date.now()}`,
            from: fromCharId,
            text: content,
            time: this.data.time,
            day: this.data.day,
            isNew: true
        };
        this.data.messages.unshift(msg); // 新消息排在前面
        console.log(`📱 收到来自 [${fromCharId}] 的新简讯: "${content}"`);
        // 触发 UI 提示 (可以后续在 engine 处理)
        this.setFlag('has_unread_messages', true);
    }

    getMessages() {
        return this.data.messages;
    }

    // ==========================================
    // 调度系统引擎接口
    // ==========================================

    /**
     * 引擎解析并执行 Action 对象
     * 标准 Action 格式示例:
     * { "func": "modifyFavor", "params": ["haruno", 15] }
     */
    dispatch(action) {
        if (!action || !action.func) return;

        if (typeof this[action.func] === 'function') {
            // 解析出函数的参数列表并将其展开传参调用
            try {
                this[action.func](...(action.params || []));
            } catch (err) {
                console.error(`❌ 执行状态函数失败 [${action.func}]:`, err);
            }
        } else {
            console.warn(`⚠️ 未知的状态函数调用: ${action.func}`);
        }
    }

    /**
     * 批量执行行动数组并发起一次存档
     */
    dispatchActions(actions) {
        if (!Array.isArray(actions)) return;
        actions.forEach(action => this.dispatch(action));
        this.save();
    }
}

export const gameState = new GameState();
