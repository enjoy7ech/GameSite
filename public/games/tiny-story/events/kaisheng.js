import { gameState } from '../state.js';

/**
 * 海生 (Kaisheng) - 事件逻辑库
 * 
 * 角色性格：
 * - 踏实诚恳，海边的守护者。
 * - 低好感：把你当成普通邻居，聊聊天气和出海。
 * - 中好感：分享生活琐事，邀请你一起帮忙维护码头。
 * - 高好感：表现出对主角强大的信任。
 */

export const kaishengEvents = [
    /**
     * 事件：码头的歇息 (中级)
     */
    {
        id: 'kaisheng_rest_after_work',
        type: 'dynamic',
        priority: 100,
        condition: (engine) => {
            const time = gameState.get('time');
            const currentLoc = gameState.get('location');
            const favor = gameState.getFavor('kaisheng');
            // 好感度 > 20，傍晚时分在码头出会
            return currentLoc === '码头' && time >= '17:00' && time < '19:00' && favor >= 20 && !gameState.getFlag('kaisheng_rested');
        },
        action: (engine) => {
            engine.runNode('event_kaisheng_rest_dialog');
            gameState.setFlag('kaisheng_rested', true);
            return true;
        }
    },

    /**
     * 简讯事件：修车的协助
     * 海生对各种机械很感兴趣，如果你在帮原野修车，或者好感足够，他会发来建议。
     */
    {
        id: 'kaisheng_sms_help',
        type: 'dynamic',
        priority: 60,
        condition: (engine) => {
            const favor = gameState.getFavor('kaisheng');
            // 如果玩家刚好在修车站
            return favor >= 25 && !gameState.getFlag('kaisheng_sms_help_sent');
        },
        action: (engine) => {
            gameState.receiveMessage('kaisheng', '野，我听说车站那边又有几辆老式单车坏了，如果你想修，记得带把活动扳手，车站工具箱里的那个已经生锈了。');
            gameState.setFlag('kaisheng_sms_help_sent', true);
            return false;
        }
    }
];
