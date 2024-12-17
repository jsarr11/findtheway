let totalWeight = 0;

export function addEdgeWeight(weight) {
    totalWeight += weight;
    updateWeightDisplay();
}

export function subtractEdgeWeight(weight) {
    totalWeight -= weight;
    updateWeightDisplay();
}

function updateWeightDisplay() {
    const currentLanguage = localStorage.getItem('language') || 'el';
    const weightDisplayId = currentLanguage === 'en' ? '#total-weight-en' : '#total-weight-el';

    $(weightDisplayId).text(totalWeight);
}

$(document).ready(function() {
    // Initialize the display on page load
    updateWeightDisplay();
});
