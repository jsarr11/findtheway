export let totalSeconds = 0;
let timerInterval;
let isPaused = false;

export function startTimer() {
    console.log("startTimer() called"); // Debugging

    if (timerInterval) {
        clearInterval(timerInterval); // Stop any existing timer first
    }

    // Ensure the timer starts from 0 if reset
    if (totalSeconds === 0) {
        console.log("Restarting timer from zero.");
    }

    timerInterval = setInterval(updateTimer, 1000);
    updateTimer(); // Immediately update UI to show 0:00
}


export function updateTimer() {
    if (!isPaused) {
        totalSeconds++;
        // console.log("updateTimer() running. Total Seconds:", totalSeconds); // Debugging

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
    console.log("Stopping Timer. Final Total Seconds:", totalSeconds); // Debugging

    clearInterval(timerInterval);
    timerInterval = null;
    isPaused = false; // Reset pause state
}


export function pauseTimer() {
    isPaused = true;
}

export function resumeTimer() {
    isPaused = false;
}

export function resetTimer() {
    console.log("resetTimer() called"); // Debugging
    clearInterval(timerInterval);
    timerInterval = null;
    totalSeconds = 0;  // Reset time only when restarting
    isPaused = false;

    const currentLanguage = localStorage.getItem('language') || 'el';
    const minuteId = currentLanguage === 'en' ? '#minutes-en' : '#minutes-el';
    const secondId = currentLanguage === 'en' ? '#seconds-en' : '#seconds-el';

    $(minuteId).text("00");
    $(secondId).text("00");

    console.log("Timer reset complete.");
}



$(document).ready(function() {
    startTimer();
});