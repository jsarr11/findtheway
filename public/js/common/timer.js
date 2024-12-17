export let totalSeconds = 0;
let timerInterval;

function startTimer() {
    timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
    totalSeconds++;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    const currentLanguage = localStorage.getItem('language') || 'el';
    const minuteId = currentLanguage === 'en' ? '#minutes-en' : '#minutes-el';
    const secondId = currentLanguage === 'en' ? '#seconds-en' : '#seconds-el';

    $(minuteId).text(minutes.toString().padStart(2, '0'));
    $(secondId).text(seconds.toString().padStart(2, '0'));
}

export function stopTimer() {
    clearInterval(timerInterval);
}

$(document).ready(function() {
    startTimer();
});
