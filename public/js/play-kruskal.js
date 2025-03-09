    function showCustomLevelPopup() {
    $('#customLevelPopup').show();
    localizePopup();
}

    function closeCustomLevelPopup() {
    $('#customLevelPopup').hide();
}

    function updateEdgeConstraints() {
    const vertices = parseInt($('#vertices').val());
    const maxEdges = (vertices * (vertices - 1)) / 2;
    $('#edges').attr('min', vertices - 1);
    $('#edges').attr('max', maxEdges);
    checkInputs();
}

    function checkInputs() {
    const vertices = $('#vertices').val();
    const edges = $('#edges').val();
    const minWeight = $('#minWeight').val();
    const maxWeight = $('#maxWeight').val();

    $('#playButton').prop('disabled', !(vertices && edges && minWeight && maxWeight));
}

    function playGame(level) {
    const currentLanguage = localStorage.getItem('language') || 'el';
    const langSuffix = currentLanguage === 'en' ? 'en' : 'el';
    window.location.href = `/main-game-kruskal?level=${level}`;
}

    function playCustomGame() {
    const currentLanguage = localStorage.getItem('language') || 'el';
    const langSuffix = currentLanguage === 'en' ? 'en' : 'el';

    const vertices = parseInt($('#vertices').val());
    const edges = parseInt($('#edges').val());
    const minWeight = parseInt($('#minWeight').val());
    const maxWeight = parseInt($('#maxWeight').val());

    const maxEdges = (vertices * (vertices - 1)) / 2;

    // Messages differ based on language
    const invalidVerticesMsg = currentLanguage === 'en' ?
    "Invalid input: Number of vertices must be between 4 and 12." :
    "Μη έγκυρη είσοδος: Ο αριθμός των κορυφών πρέπει να είναι μεταξύ 4 και 12.";

    const invalidEdgesMsg = currentLanguage === 'en' ?
    `Invalid input: Number of edges must be between ${vertices + 2} and ${maxEdges} for ${vertices} vertices.` :
    `Μη έγκυρη είσοδος: Ο αριθμός των ακμών πρέπει να είναι μεταξύ ${vertices + 2} και ${maxEdges} για ${vertices} κορυφές.`;

    const invalidWeightsMsg = currentLanguage === 'en' ?
    "Invalid input: Weights must be between 1 and 50." :
    "Μη έγκυρη είσοδος: Τα βάρη πρέπει να είναι μεταξύ 1 και 50.";

    const minGreaterThanMaxMsg = currentLanguage === 'en' ?
    "Invalid input: Minimum weight cannot be greater than maximum weight." :
    "Μη έγκυρη είσοδος: Το ελάχιστο βάρος δεν μπορεί να είναι μεγαλύτερο από το μέγιστο βάρος.";

    if (vertices < 5 || vertices > 12) {
    showErrorMessage(invalidVerticesMsg);
    return;
}
    if (edges < vertices + 2 || edges > maxEdges) {
    showErrorMessage(invalidEdgesMsg);
    return;
}
    if (minWeight < 1 || minWeight > 50 || maxWeight < 1 || maxWeight > 50) {
    showErrorMessage(invalidWeightsMsg);
    return;
}
    if (minWeight > maxWeight) {
    showErrorMessage(minGreaterThanMaxMsg);
    return;
}

    window.location.href = `/main-game-kruskal?level=custom&vertices=${vertices}&edges=${edges}&minWeight=${minWeight}&maxWeight=${maxWeight}`;
}

    function showErrorMessage(message) {
    $('#error-message').text(message).show();
}

    function localizePopup() {
    const currentLanguage = localStorage.getItem('language') || 'el';

    if (currentLanguage === 'en') {
    $('#popup-title').text("Create custom level");
    $('#label-vertices').text("Number of vertices:");
    $('#label-edges').text("Number of edges:");
    $('#label-minWeight').text("Minimum weight:");
    $('#label-maxWeight').text("Maximum weight:");
    $('#playButton').text("Play");
} else {
    $('#popup-title').text("Δημιουργία προσαρμοσμένου επιπέδου");
    $('#label-vertices').text("Αριθμός κορυφών:");
    $('#label-edges').text("Αριθμός ακμών:");
    $('#label-minWeight').text("Ελάχιστο βάρος:");
    $('#label-maxWeight').text("Μέγιστο βάρος:");
    $('#playButton').text("Παίξε");
}
}

    $(document).ready(function() {
    $('#vertices, #edges, #minWeight, #maxWeight').on('input', checkInputs);
});