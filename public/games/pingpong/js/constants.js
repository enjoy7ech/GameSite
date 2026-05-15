export const TABLE_WIDTH = 1.525;
export const TABLE_LENGTH = 2.74;
export const TABLE_HEIGHT = 0.76;
export const NET_HEIGHT = 0.1525;
export const BALL_RADIUS = 0.02; // 40mm diameter
export const PADDLE_RADIUS = 0.1;
export const PADDLE_THICKNESS = 0.06;

export const ROOM_SIZE = 20;

// Paddle Interaction Configuration
export const PADDLE_CONFIG = {
    // 俯仰角 (Pitch) - 控制上下移动时的拍面前倾/后仰
    pitch: {
        maxAngle: Math.PI / 4,  // 最大倾斜角度限制在 45 度 (原为 90 度)
        intensity: 5,         // 倾斜强度系数，越大随高度变化越快
        neutralY: 1           // 拍面完全垂直时的默认高度基准
    },
    // 侧倾角 (Roll) - 控制左右移动时的拍柄内收
    roll: {
        maxAngle: Math.PI / 2.4, // 最大侧倾角度 (默认约 75 度)
        intensity: 1.5           // 侧倾强度系数，越大越容易躺平
    },
    // 猛推发力 (Smash) - 控制鼠标快划时的突进
    smash: {
        maxVelocity: 0.8,       // 最大突进速度上限
        sensitivity: 0.015,     // 鼠标滑速转化为突进速度的灵敏度
        decay: 0.8,             // 突进后的弹回摩擦力 (越小弹回越快)
        reachMult: 2.0          // 突进距离放大倍数
    },
    // 物理击球参数 (Physics) - 后续商店高级球拍可配置
    physics: {
        restitution: 0.95,      // 弹性系数 (Bounciness) - 越大球弹得越远
        friction: 0.6,          // 摩擦力 (Grip) - 越大越容易造旋转球
        hitTolerance: 0.1      // 击球判定容错距离 (米) - 值越大越容易击中球
    },
    // 外观与涂装 (Cosmetics) - 商店皮肤系统
    cosmetics: {
        forehandColor: 0xcc2222, // 正手胶皮默认颜色 (中国红)
        backhandColor: 0x1a1a1a, // 反手胶皮默认颜色 (经典黑)
        modelOffset: { x: 0, y: -0.043, z: 0 } // 调整视觉模型与物理碰撞体的相对位置
    },
    // 基础参数 (Base)
    basePosition: {
        z: 1.5 // 球拍在桌子外的默认纵深位置
    }
};

// Ball Interaction Configuration
export const BALL_CONFIG = {
    serve: {
        offset: { x: 0, y: 0.05, z: -0.2 }, // 发球时，球悬浮在球拍的正上方 (Z=0 确保掉下来刚好砸到拍子)
        tossVelocity: 3               // 发球时左键抛球的初始垂直向上的速度 (m/s)
    }
};

// Rendering & Visual Configuration
export const RENDER_CONFIG = {
    // Debug tools
    debugPhysics: 0, // Toggle this to show/hide the physical collision wireframes (Table, Net, Paddle)

    // Camera settings
    camera: {
        fov: 60,
        position: { x: 0, y: 1.8, z: 2.8 }, // Moved closer. Lower Y and Z to get nearer to the table
        lookAtY: TABLE_HEIGHT // The height the camera is looking at
    },

    // Bloom (Glow) settings
    bloom: {
        enabled: true,
        strength: 2.5,     // Intensity of the glow
        radius: 0.6,       // Spread of the glow
        threshold: 0.95    // Min brightness to trigger glow (0 to 1). Higher means only the brightest objects glow.
    },
    
    // Model Material settings
    materials: {
        emissiveBoost: 10, // Multiplier to make imported emissive materials glow brighter
        zFightingOffset: -1 // Depth offset to prevent flickering on coplanar decals
    },
    
    // Lighting settings
    lighting: {
        ambientIntensity: 0.6,
        directionalIntensity: 0.5,
        spotlightIntensity: 0.8,
        shadowBias: -0.0001,
        shadowNormalBias: 0.02
    }
};
