/**
 * map.js - 游戏大地图与位置计算模块
 * 用于存储各地理坐标点，并进行路径耗时等坐标运算。
 */

/**
 * 此文件的功效，MCP
 * 
 * Define
 * 1. 存储地图坐标点
 * 2. 计算路径耗时
 * 
 * Skills
 * 1. 能够根据坐标计算距离
 * 2. 能够根据距离计算时间
 */


export const townMap = {
    /**
     * 坐标系统 (0-1000 范围，分别代表 X, Y)
     * 参照现有的 "world" JSON 数据和剧情地点
     */
    locations: {
        "清风站": { x: 900, y: 850 },
        "车站路口": { x: 880, y: 830 },
        "主角家": { x: 800, y: 300 },
        "风月书屋": { x: 500, y: 500 },
        "潮汐咖啡馆": { x: 450, y: 700 },
        "码头": { x: 150, y: 400 },
        "灯塔": { x: 50, y: 100 }
    },

    /**
     * 计算两个地点之间的自动移动耗时（基于欧几里得距离）
     * @param {string} fromName 起点名称
     * @param {string} toName 终点名称
     * @param {number} speed 单位时间行进量 (默认 20单位/分钟)
     * @returns {number} 折算后的耗时（分钟）
     */
    calculateTravelTime(fromName, toName, speed = 20) {
        if (fromName === toName) return 0;

        const locA = this.locations[fromName];
        const locB = this.locations[toName];

        if (!locA || !locB) {
            console.warn(`⚠️ 未知坐标地图点，强制按邻区短途计算: ${fromName} -> ${toName}`);
            return 5; // 找不到对应坐标系时，默认耗时 5 分钟兜底
        }

        const dx = locA.x - locB.x;
        const dy = locA.y - locB.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // 算出耗时后四舍五入。最快也必须算作 1 分钟移动
        const minutes = Math.round(distance / speed);
        return Math.max(1, minutes);
    }
};
