import { gameState } from '../state.js';

/**
 * 姑姑 (Auntie) - 事件定义
 * 特点：亲切、在家中出没
 */

export const auntieEvents = [
    // 示例：姑姑叫你吃饭
    {
        id: 'auntie_call_dinner',
        type: 'dynamic',
        priority: 150, // HIGH
        condition: (engine) => {
            const time = gameState.get('time');
            const currentLoc = gameState.get('location');
            return currentLoc === '主角家' && time >= '18:30' && time < '19:30' && !gameState.getFlag('auntie_dinner_called');
        },
        action: (engine) => {
            engine.runNode('event_auntie_dinner');
            gameState.setFlag('auntie_dinner_called', true);
            return true;
        }
    }
];
