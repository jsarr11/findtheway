let totalWeight = 0;

export function addEdgeWeight(weight) {
    totalWeight += weight;
    updateWeightDisplay();
}

export function subtractEdgeWeight(weight) {
    totalWeight = Math.max(0, totalWeight - weight);
    updateWeightDisplay();
}

export function resetEdgeWeights() { // Add this function
    totalWeight = 0;
    updateWeightDisplay();
}

function updateWeightDisplay() {
    const currentLanguage = localStorage.getItem('language');
    const language = currentLanguage === 'en' ? 'en' : 'el';
    const weightDisplayId = `#total-weight-${language}`;

    if ($(weightDisplayId).length) {
        $(weightDisplayId).text(totalWeight);
    }
}

$(document).ready(function() {
    updateWeightDisplay();
});
