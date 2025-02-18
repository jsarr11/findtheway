export let totalSeconds = 0;
let timerInterval;
let isPaused = false;

export function startTimer() {
    if (!timerInterval) {
        timerInterval = setInterval(updateTimer, 1000);
    }
}

export function updateTimer() {
    if (!isPaused) {
        totalSeconds++;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        const currentLanguage = localStorage.getItem('language') || 'el';
        const minuteId = currentLanguage === 'en' ? '#minutes-en' : '#minutes-el';
        const secondId = currentLanguage === 'en' ? '#seconds-en' : '#seconds-el';

        $(minuteId).text(minutes.toString().padStart(2, '0'));
        $(secondId).text(seconds.toString().padStart(2, '0'));
    }
}

export function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    totalSeconds = 0;
    isPaused = false; // Reset pause state
}


export function pauseTimer() {
    isPaused = true;
}

export function resumeTimer() {
    isPaused = false;
}

$(document).ready(function() {
    startTimer();
});