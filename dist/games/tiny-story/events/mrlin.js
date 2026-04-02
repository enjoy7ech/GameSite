import { gameState } from '../state.js';

/**
 * 林老师 (Mr. Lin) - 事件定义
 * 特点：博学、怀旧、经常在书屋工作
 */

export const mrlinEvents = [
    // 示例：林老师在某些时段的深沉时刻
    {
        id: 'mrlin_teaching_wisdom',
        type: 'dynamic',
        priority: 150, // HIGH
        condition: (engine) => {
            const time = gameState.get('time');
            const currentLoc = gameState.get('location');
            const stats = gameState.getStat('Obs') || 0;
            return currentLoc === '风月书屋' && time >= '14:00' && time < '16:00' && stats > 15 && !gameState.getFlag('mrlin_wisdom_triggered');
        },
        action: (engine) => {
            engine.runNode('event_mrlin_wisdom_deep');
            gameState.setFlag('mrlin_wisdom_triggered', true);
            return true;
        }
    }
];
