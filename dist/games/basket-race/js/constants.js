// --- STATIC SETTINGS ---
export const HOOP_POS = { x: 0, y: 8.1, z: 0 };
export const GLB_SCALE = 3;
export const RING_RADIUS = 0.75;
export const BALL_RADIUS = 0.5;

// 球色定义 (奖励球)
export const BALL_COLORS = {
    NORMAL: 0xee6730,  // 经典橙 (普通)
    TIME: 0x00ffcc,  // 霓虹绿 (加时 +15s)
    GOLD: 0xffd700,  // 黄金色 (单次得分 x5)
    COMBO: 0xff0066,  // 狂野粉 (连击数直接 +3)
    BUFF: 0x0066ff   // 晶钻蓝 (系数永久提升)
};

export const PUNISH_COLORS = {
    SIDE: 0x8800ff,  // 魅紫色 (死角挑战)
    JAIL: 0x440022,  // 幽暗红 (地狱入篮)
    BLIND: 0x111111,  // 漆黑 (盲投挑战)
    TIMER: 0xff3300   // 亮红 (时间窃取)
};

export const BALL_DESCRIPTIONS = {
    time: "时间超频",
    gold: "分值倍化",
    combo: "连击跳跃",
    buff: "永久迭代",

    side: "边际生存",
    jail: "逆流挑战",
    blind: "视觉脱钩",
    timer: "时间塌缩"
};

// --- 游戏文案提示词管理 (Prompts & Messages) ---
export const MESSAGES = {
    PRAISE: ["完美衔接!", "目标捕获!", "序列闭合!", "哇呼!", "手感火热!", "神射手!", "不可思议!", "极限进球!"],
    SWISH: "SWISH!!",
    AIRBALL: "同步失效! 无效操作。",
    LEVEL_UP: "PROTOCOL UPGRADED!",
    LEVEL_INFO: (level, target) => `PHASE ${level} - 目标同步: ${target}`,
    RESULT_WIN: "同步成功：已解析球场序列。",
    RESULT_LOSE: "载入失败：同步率不足，请提升神经耐受度。",
    BUFF_DISTANCE: (lv) => `Lv.${lv}`,
    BUFF_HEIGHT: (val) => `x${val.toFixed(2)}`,
    BUFF_ANGLE: (val) => `${val.toFixed(1)}%`
};

// 难度梯度配置
export const LEVELS = [
    { target: 100, time: 60 },
    { target: 300, time: 60 },
    { target: 800, time: 50 },
    { target: 2000, time: 45 },
    { target: 5000, time: 40 }
];

export const PHYS_FRICTION = 0.1;
export const PHYS_RESTITUTION = 0.6;
export const GRAVITY = -22; 
