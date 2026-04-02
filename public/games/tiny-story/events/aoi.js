import { gameState } from '../state.js';

/**
 * 葵 (Aoi) - 事件逻辑库
 * 
 * 角色性格：
 * - 沉静淡然，咖啡馆的老板娘。
 * - 低好感：公事公办，礼貌而疏离。
 * - 中好感：开始谈论咖啡豆的产地和“等待”的哲学。
 * - 高好感：暗示她一直在等主角回来，并分享心中的不安。
 */

export const aoiEvents = [
    /**
     * 事件：咖啡馆的漫长午后 (低好感)
     */
    {
        id: 'aoi_greet_low',
        type: 'dynamic',
        priority: 100,
        condition: (engine) => {
            const currentLoc = gameState.get('location');
            const favor = gameState.getFavor('aoi');
            return currentLoc === '咖啡厅' && favor < 15 && !gameState.getFlag('aoi_greet_low_triggered');
        },
        action: (engine) => {
            engine.runNode('char_aoi_greet_neutral'); // 初始还是比较客气的
            gameState.setFlag('aoi_greet_low_triggered', true);
            return true;
        }
    },

    /**
     * 事件：海边的深夜漫步 (高好感)
     * 只有当你和葵足够亲近，她才会在码头散步时停下来等你。
     */
    {
        id: 'aoi_late_night_stroll',
        type: 'dynamic',
        priority: 110,
        condition: (engine) => {
            const time = gameState.get('time');
            const currentLoc = gameState.get('location');
            const favor = gameState.getFavor('aoi');
            // 好感度 > 40，码头深夜
            return currentLoc === '码头' && (time >= '21:00' || time < '02:00') && favor >= 40 && !gameState.getFlag('aoi_stroll_triggered');
        },
        action: (engine) => {
            engine.runNode('event_aoi_dock_night');
            gameState.setFlag('aoi_stroll_triggered', true);
            return true;
        }
    },

    /**
     * 简讯事件：咖啡馆的点单提醒
     * 当好感度提升，葵会发来关于新品豆子的简讯。
     */
    {
        id: 'aoi_sms_coffee',
        type: 'dynamic',
        priority: 55,
        condition: (engine) => {
            const favor = gameState.getFavor('aoi');
            return favor >= 35 && !gameState.getFlag('aoi_sms_coffee_sent');
        },
        action: (engine) => {
            gameState.receiveMessage('aoi', '新进了一批曼特宁，风味比上次的更醇厚一些，如果你有空，可以过来尝尝。');
            gameState.setFlag('aoi_sms_coffee_sent', true);
            return false;
        }
    }
];
