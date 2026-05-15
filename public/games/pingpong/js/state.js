export const state = {
    scene: null,
    camera: null,
    renderer: null,
    world: null, // Cannon.js world
    
    table: null,
    ball: null,
    playerPaddle: null,
    aiPaddle: null,
    
    score: {
        player: 0,
        ai: 0
    },
    
    game: {
        isServing: true,
        server: 'player', // 'player' or 'ai'
        status: 'playing', // 'playing', 'point_scored'
        lastHitBy: null, // 'player' or 'ai'
        bouncesOnPlayer: 0,
        bouncesOnAI: 0,
        message: ''
    },
    
    gameState: 'loading', // loading, menu, playing, paused, ended
};
