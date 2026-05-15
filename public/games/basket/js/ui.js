import * as THREE from 'three';
import { state } from './state.js';
import { MESSAGES, HOOP_POS } from './constants.js';

export function toggleMenu() {
    if (state.gameState !== 'playing' && state.gameState !== 'paused') return;
    state.isPaused = !state.isPaused;
    if (state.isPaused) {
        state.gameState = 'paused';
        state.pauseOffset = Date.now() - state.startTime;
        document.getElementById('menu-overlay').classList.remove('hidden');
    } else {
        state.gameState = 'playing';
        state.startTime = Date.now() - state.pauseOffset;
        document.getElementById('menu-overlay').classList.add('hidden');
    }
}

export function updateScoreDisplay(lastPoints = null) {
    const scoreEl = document.getElementById('scoreboard');
    scoreEl.innerText = "表现分: " + state.score;

    // --- 新增：左上角 HUD 显示当前球的难度系数 ---
    const currentDiffEl = document.getElementById('current-diff');
    if (currentDiffEl) {
        currentDiffEl.innerText = state.currentBallDiff.toFixed(0);
    }

    // 动态显示最近一次得分的变化
    if (lastPoints !== null) {
        const popEl = document.getElementById('score-pop');
        if (popEl) {
            popEl.innerText = `+${lastPoints}`;
            popEl.classList.remove('animate-pop');
            void popEl.offsetWidth; // 触发重绘
            popEl.classList.add('animate-pop');
        }
    }

    const rateEl = document.getElementById('hit-rate');
    if (rateEl && state.shotsTaken > 0) {
        const rate = (state.shotsMade / state.shotsTaken) * 100;
        rateEl.innerText = rate.toFixed(1) + '%';
    }
    updateComboUI();
    updatePunishUI();
    updateSidePunishUI();
    updateRewardUI();
}

export function updateSidePunishUI() {
    const container = document.getElementById('side-punish-ui');
    const fillEl = document.getElementById('side-punish-fill');
    const timerEl = document.getElementById('side-punish-timer');
    if (!container || !fillEl || !timerEl) return;

    if (state.sidePunishTime > 0) {
        container.style.display = 'block';
        const percent = (state.sidePunishTime / 30) * 100;
        fillEl.style.width = percent + '%';
        timerEl.innerText = state.sidePunishTime.toFixed(1) + 's';
    } else {
        container.style.display = 'none';
    }
}

export function updateRewardUI() {
    const container = document.getElementById('reward-phase-ui');
    const fillEl = document.getElementById('reward-phase-fill');
    const timerEl = document.getElementById('reward-phase-timer');
    if (!container || !fillEl || !timerEl) return;

    if (state.isRewardPhase && state.rewardTimeLeft > 0) {
        container.style.display = 'block';
        const percent = Math.min(100, (state.rewardTimeLeft / 30) * 100); // 30s 为满条
        fillEl.style.width = percent + '%';
        timerEl.innerText = state.rewardTimeLeft.toFixed(1) + 's';
    } else {
        container.style.display = 'none';
    }
}

export function updatePunishUI() {
    const fillEl = document.getElementById('punish-progress-fill');
    const textEl = document.getElementById('punish-count-text');
    if (fillEl && textEl) {
        const percent = (state.missCount / 5) * 100;
        fillEl.style.width = Math.min(100, percent) + '%';
        textEl.innerText = `MISS: ${state.missCount}/5`;

        // 临近惩罚时增加闪烁效果
        if (state.missCount >= 4) {
            fillEl.style.animation = 'fire-pulse 0.3s infinite alternate';
        } else {
            fillEl.style.animation = 'none';
        }
    }
}

export function updateComboUI() {
    const el = document.getElementById('combo-fire');
    const valEl = document.getElementById('combo-value');
    if (el && valEl) {
        if (state.comboCount > 1) {
            el.style.display = 'flex';
            valEl.innerText = 'X' + state.comboCount;
        } else {
            el.style.display = 'none';
        }
    }
}

export function updateBuffUI() {
    const distEl = document.getElementById('dist-coeff');
    const heightEl = document.getElementById('height-coeff');
    if (distEl) distEl.innerText = state.distCoeff.toFixed(2);
    if (heightEl) heightEl.innerText = state.heightCoeff.toFixed(2);
}

export function showPraise(content) {
    const el = document.getElementById('score-msg');

    const isNewHighPriority = typeof content === 'string' && (content.includes('SWISH') || content.includes('奖励') || content.includes('挑战'));
    const isCurrentHighPriority = el.classList.contains('swish-text');

    // 只有在当前显示高优先级且新消息不是高优先级时，才跳过 (保护 SWISH 效果不被普通提示瞬间覆盖)
    if (isCurrentHighPriority && !isNewHighPriority) return;

    // --- 强制重置动画 ---
    el.className = '';
    el.style.opacity = '0';
    void el.offsetWidth; // 强制重绘 (Reflow)
    el.style.opacity = '';

    if (isNewHighPriority) {
        el.innerText = content;
        el.classList.add('swish-text');
    } else {
        el.innerText = typeof content === 'number' ? `+${content}` : content;
        el.classList.add('pop-up');
    }

    if (state.praiseTimeout) clearTimeout(state.praiseTimeout);
    state.praiseTimeout = setTimeout(() => {
        el.classList.remove('swish-text', 'pop-up');
    }, 1200);
}

export function triggerScreenShake() {
    const ui = document.getElementById('ui-container');
    ui.classList.remove('shaking', 'flash');
    void ui.offsetWidth;
    ui.classList.add('shaking', 'flash');
    setTimeout(() => {
        ui.classList.remove('shaking', 'flash');
    }, 400);
}
