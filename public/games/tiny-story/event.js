/**
 * TinyFlow Event Registry (Unified)
 * 该文件作为总线，统一加载并聚合所有分角色的事件定义
 */

/**
 * 此文件的功效，MCP
 * 
 * Define
 * 1. 统一加载所有分角色的事件定义
 * 2. 按优先级从高到低排序执行
 * 3. 组织决策：取出最高优先级的一个事件执行
 * 
 * Skills
 * 1. 能够根据时间自动触发事件
 * 2. 能够根据地点自动触发事件
 * 3. 能够根据好感度自动触发事件
 * 4. 能够根据物品自动触发事件
 * 5. 能够根据状态自动触发事件
 * 6. 能够根据事件自动触发事件
 */

import { systemEvents } from './events/system.js';
import { harunoEvents } from './events/haruno.js';
import { aoiEvents } from './events/aoi.js';
import { kaishengEvents } from './events/kaisheng.js';
import { mrlinEvents } from './events/mrlin.js';
import { auntieEvents } from './events/auntie.js';

/**
 * 全局动态事件聚合列表
 */
const GLOBAL_EVENTS = [
    ...systemEvents,
    ...harunoEvents,
    ...aoiEvents,
    ...kaishengEvents,
    ...mrlinEvents,
    ...auntieEvents
];

/**
 * 全局事件轮询处理器
 * 按优先级从高到低排序执行。
 * 
 * @param {object} engine - 传入的游戏引擎实例
 * @returns {boolean} - true 代表当前操作被劫持（由于触发了特殊剧情），false 则继续主流程
 */
export function processGlobalEvents(engine) {
    let hasIntercepted = false;
    const currentTime = engine.state.get('time')

    if (!currentTime) return;

    // 1. 过滤出当前满足条件的事件
    const triggeredEvents = GLOBAL_EVENTS.filter(e => {
        try {
            // 新增：时间条件预检 (cron 语法支持)
            if (e.cron && !matchTimeCron(e.cron, currentTime)) return false;

            return e.condition(engine);
        } catch (err) {
            console.error(`Condition error [${e.id}]:`, err);
            return false;
        }
    });

    // 2. 按优先级排序
    triggeredEvents.sort((a, b) => b.priority - a.priority);

    // 3. 组织决策：取出最高优先级的一个事件执行
    if (triggeredEvents.length > 0) {
        const topEvent = triggeredEvents[0];
        console.log(`🔍 触发事件: [${topEvent.id}] (Priority: ${topEvent.priority})`);

        try {
            const isIntercept = topEvent.action(engine);
            if (isIntercept) {
                hasIntercepted = true;
            }
        } catch (err) {
            console.error(`Action execution error [${topEvent.id}]:`, err);
        }
    }

    return hasIntercepted;
}

/**
 * Cron 辅助逻辑：支持 "08:00-10:00" 或 "18-20 *" 等语法
 */
function matchTimeCron(cron, time) {
    if (!cron || cron === '*') return true;

    // 1. 简易范围格式: "08:00-10:00"
    if (cron.includes(':') && cron.includes('-')) {
        const [start, end] = cron.split('-');
        if (start <= end) {
            return time >= start && time <= end;
        } else {
            // 跨天逻辑 (22:00-02:00)
            return time >= start || time <= end;
        }
    }

    // 2. 类 Cron 格式: "小时 分钟" (e.g. "8-10 *")
    const parts = cron.split(' ');
    const [tH, tM] = time.split(':').map(Number);

    const matchPart = (p, t) => {
        if (!p || p === '*') return true;
        if (p.includes('-')) {
            const [s, e] = p.split('-').map(Number);
            return t >= s && t <= e;
        }
        if (p.includes(',')) {
            return p.split(',').map(Number).includes(t);
        }
        return Number(p) === t;
    };

    return matchPart(parts[0], tH) && matchPart(parts[1], tM);
}
