import { gameState } from '../state.js';

/**
 * 原野 (Haruno) - 事件逻辑库
 * 
 * 角色性格：
 * - 低好感：防备心强、言语刻薄。
 * - 中好感：开始展示对艺术的热爱，偶尔会主动要求帮忙。
 * - 高好感：产生依赖感，会主动分享内心深处的秘密。
 */

export const harunoEvents = [
    /**
     * 事件：车站偶遇 (初级)
     * 触发条件：在车站，且好感度处于起步阶段
     */
    {
        id: 'haruno_encounter_station_low',
        type: 'dynamic',
        priority: 100,
        cron: '08:00-10:30', // 早高峰时间
        condition: (engine) => {
            const currentLoc = gameState.get('location');
            const favor = gameState.getFavor('haruno');
            return currentLoc === '清风站' && favor < 20 && !gameState.getFlag('haruno_station_low_triggered');
        },
        action: (engine) => {
            engine.runNode('char_haruno_greet_cold'); // 触发冷谈的打招呼
            gameState.setFlag('haruno_station_low_triggered', true);
            return true;
        }
    },

    /**
     * 事件：码头博弈 (中级)
     * 触发条件：在码头，好感度中等。原野会取笑海生来测试主角。
     */
    {
        id: 'dynamic_haruno_tease_kaisheng',
        type: 'dynamic',
        priority: 200,
        cron: '14:00-17:30', // 下午阳光最好的时候
        condition: (engine) => {
            const currentLoc = gameState.get('location');
            const favor = gameState.getFavor('haruno');
            return currentLoc === '码头' && favor >= 40 && !gameState.getFlag('haruno_teased_kaisheng');
        },
        action: (engine) => {
            engine.runNode('char_haruno_interact_kaisheng_1');
            gameState.setFlag('haruno_teased_kaisheng', true);
            return true;
        }
    },

    /**
     * 简讯事件：深夜的绘画
     * 触发条件：好感度较高，且在深夜时刻。
     * 表现：原野会发来一张她深夜创作的随笔画稿信息。
     */
    {
        id: 'haruno_sms_sketch',
        type: 'dynamic',
        priority: 50,
        cron: '22:00-01:00', // 深夜静谧时刻
        condition: (engine) => {
            const favor = gameState.getFavor('haruno');
            return favor >= 50 && !gameState.getFlag('haruno_sms_sketch_sent');
        },
        action: (engine) => {
            gameState.receiveMessage('haruno', '喂，还没睡吧？刚才画了一张海边的速写，总觉得阴影的部分处理得不对... 算了，跟你说这些干嘛。');
            gameState.setFlag('haruno_sms_sketch_sent', true);
            return false; // 发简讯不劫持当前流程，属于后台提示
        }
    },

    /**
     * 事件：归还画稿
     * 触发条件：在车站路口，且身上带有 haruno_sketches 物品
     */
    {
        id: 'haruno_return_sketches_event',
        type: 'dynamic',
        priority: 300,
        condition: (engine) => {
            const currentLoc = gameState.get('location');
            const hasItem = gameState.hasItem('haruno_sketches');
            return currentLoc === '车站路口' && hasItem && !gameState.getFlag('haruno_returned_sketches');
        },
        action: (engine) => {
            engine.runNode('event_haruno_return_sketches');
            gameState.setFlag('haruno_returned_sketches', true);
            return true;
        }
    }
];
