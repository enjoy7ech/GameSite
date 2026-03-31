import * as THREE from 'three';

// --- DYNAMIC STATE ---
export const state = {
    // Three.js Core
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    timeScale: 1.5, // 默认速度调整为原 120FPS 的 75% (1.5x 物理步长)

    // Cannon.js Core
    world: null,
    physMaterial: null,
    netMaterial: null,

    // Shared Meshes/Bodies
    floorBody: null,
    boardBody: null,
    distributeBuffs: [],

    // Game Objects
    currentBall: null,
    activeBalls: [],
    ringBodies: [],
    netParticles: [],
    netLinesGeo: null,
    basketballTemplate: null,
    boardDisplay: null,
    currentBallDiff: 0,

    // Physics Debug
    debugPhysics: false,
    debugHelpers: [],

    // Game Logic
    score: 0,
    level: 1,
    targetScore: 100,
    timeLimit: 60,
    startTime: 0,
    timerInterval: null,
    comboCount: 0,
    maxCombo: 0,
    giveRewardNext: false,
    isPaused: false,
    pauseOffset: 0,
    shotsTaken: 0,
    shotsMade: 0,
    gameMode: 'career', // 'career' (level-based), 'rush' (fixed time)
    rushDifficulty: 'C', // D, C, B, A, S
    maxDifficultyHit: 0, // Rush mode specific
    gameState: 'menu', // 'menu', 'playing', 'paused', 'result'

    // Camera Animation
    isCameraAnimating: false,
    isUserInteracting: false,
    cameraTargetPos: new THREE.Vector3(),
    controlsTargetPos: new THREE.Vector3(),

    // Coefficients
    distCoeff: 0.8,
    heightCoeff: 1.5,
    angleCoeff: 0.2,

    // Punishment Attributes
    punishMode: null,   // 'side', 'jail', 'blind'
    punishBalls: 0,     // Remaining balls for count-based punishments
    isJailMode: false,  // Special mode for negative angle requirement
    missCount: 0,       // Consecutive misses tracker
    sidePunishTime: 0,  // Time remaining for side punishment (seconds)
    isRewardPhase: false, // NEW: Swish reward mode
    rewardTimeLeft: 0,    // NEW: Remaining reward time

    // UI Feedback
    ballTimeout: null,
    praiseTimeout: null,
    breakdownTimeout: null,

    // Audio SFX
    hitBoardAudio: null,
    hitRimAudios: [],
    hitNetAudio: null,
    hitGroundAudios: [],
    failAudios: [],
    succAudios: [],
    extAudios: [],
    comboAudio: null,
    endAudio: null,
    bgm: null
};
