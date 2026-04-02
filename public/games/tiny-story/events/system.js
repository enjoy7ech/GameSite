import { gameState } from '../state.js';

/**
 *系统级事件 (Environment/Hub/Conflict Resolution)
 *
 * 核心功能：
 * 1. 负责大气环境（早晚滤镜）切换。
 * 2. 负责拦截多个角色的高好感事件冲突（修罗场机制）。
 * 3. 负责在地点完成脚本对话后的常驻菜单加载（解决频繁跳转地图问题）。
 * 4. 负责所有角色通用的根据好感度变化的随机问候逻辑。
 */

export const systemEvents = [
    /**
     * 系统逻辑：黄昏环境切换
     */
    {
        id: 'env_sunset',
        type: 'system',
        priority: 100, // NORMAL
        condition: (engine) => {
            const time = gameState.get('time');
            return time >= '17:30' && time < '20:00';
        },
        action: (engine) => {
            engine.setGlobalBgSuffix('_sunset');
            return false; // 不劫持流程，仅作为全局后效生效
        }
    },

    /**
     * 系统逻辑：深夜环境切换
     */
    {
        id: 'env_night',
        type: 'system',
        priority: 100, // NORMAL
        condition: (engine) => {
            const time = gameState.get('time');
            return time >= '20:00' || time < '06:00';
        },
        action: (engine) => {
            engine.setGlobalBgSuffix('_night');
            return false; // 不劫持流程
        }
    },

    /**
     * 核心冲突裁决：修罗场 (海生 VS 葵)
     * 当两人对主角都有足够高的好感度，处于同一场景（码头）时触发强制冲突。
     */
    {
        id: 'conflict_dual_confession',
        type: 'conflict',
        priority: 1000,
        condition: (engine) => {
            const currentLoc = gameState.get('location');
            if (gameState.getFlag('conflict_confession_resolved')) return false;

            // 两人好感度都达到极高标准
            const kaishengReady = gameState.getFavor('kaisheng') >= 60;
            const aoiReady = gameState.getFavor('aoi') >= 60;
            return currentLoc === '码头' && kaishengReady && aoiReady;
        },
        action: (engine) => {
            engine.runNode('event_conflict_kaisheng_aoi_confess');
            gameState.setFlag('conflict_confession_resolved', true);
            return true;
        }
    },

    /**
     * 基础互动逻辑：根据好感度动态加载角色问候。
     * 当主角进入一个地点且没有正处于主线任务时，该脚本会自动执行。
     */
    {
        id: 'char_greet_interaction',
        type: 'interact',
        priority: 150,
        condition: (engine) => {
            const currentLoc = gameState.get('location');
            const isNewArrival = currentLoc !== gameState.getFlag('internal_last_loc');

            // 只有当玩家不是处于寻路中、或者正处于角色专属剧情中时才拦截
            const isNotNavigating = !engine.activeNode?.id.includes('_path_');
            const isNotInsideCharEvent = !engine.activeNode?.id.startsWith('char_') && !engine.activeNode?.id.startsWith('event_');
            return isNewArrival && isNotNavigating && isNotInsideCharEvent;
        },
        action: (engine) => {
            const currentLoc = gameState.get('location');
            gameState.setFlag('internal_last_loc', currentLoc);
            const config = engine.findLocationConfigByName(currentLoc);

            if (config && config.charId) {
                const favor = gameState.getFavor(config.charId);

                // --- 根据好感度映射节点 ---
                let level = 'neutral';
                if (favor <= 10) level = 'cold';
                else if (favor >= 45) level = 'warm'; // 此处体现了第一个需求（好感度不同执行事件有别）

                const nodeId = `char_${config.charId}_greet_${level}`;
                if (engine.story.story.some(n => n.id === nodeId)) {
                    engine.runNode(nodeId);
                    return true;
                }
            }
            return false;
        }
    },

    /**
     * 核心交互中心 (Stay-at-Location Hub)
     * 在处理完常规对话后，不再强制跳回地图，而是让玩家停留在现场。
     * 为该地点的“玩法入口”提供载体。
     */
    {
        id: 'location_action_hub',
        type: 'system',
        priority: 10, // LOW
        condition: (engine) => {
            const currentLoc = gameState.get('location');

            // 判定是否处于空闲状态
            const isNotScripted = !engine.activeNode?.id.includes('_path_') &&
                !engine.activeNode?.id.startsWith('char_') &&
                !engine.activeNode?.id.startsWith('event_');

            // Narrative Guard: 确保不切断 D1 等主线脚本
            const isNarrative = engine.activeNode?.id.startsWith('d') && engine.activeNode?.id.includes('_');

            return !isNarrative && isNotScripted && currentLoc;
        },
        action: (engine) => {
            const currentLoc = gameState.get('location');
            const config = engine.findLocationConfigByName(currentLoc);

            const specificHub = `hub_${config?.id}`;
            const genericHub = 'hub_generic';

            if (engine.story.story.some(n => n.id === specificHub)) {
                engine.runNode(specificHub);
                return true;
            } else if (engine.story.story.some(n => n.id === genericHub)) {
                engine.runNode(genericHub);
                return true;
            }

            return false;
        }
    }
];
