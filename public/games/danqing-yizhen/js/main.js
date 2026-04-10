import { prepareUI, puzzle, events, autoStart, playing, animate } from './core/Engine.js';
import { GameManager } from './game/GameManager.js';
import { ItemSystem } from './game/ItemSystem.js';

// Setup our wrapper systems
const gm = new GameManager();
// ItemSystem is already initialized inside GameManager constructor

// Check if game won
setInterval(() => {
    if (gm.isPlaying && puzzle) {
        if (puzzle.polyPieces && puzzle.imageLoaded) {
            const realPieces = puzzle.polyPieces.filter(p => !p.isFake);
            if (realPieces.length === 1) {
                gm.winGame();
            }
        }
    }
}, 1000);

// For Emerald item, let's fix it by adding a global helper or doing it directly in GameManager
window.gameManager = gm;
