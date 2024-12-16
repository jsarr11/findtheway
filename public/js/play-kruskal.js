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
    $('#edges').attr('min', vertices + 2);
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
    "Invalid input: Number of vertices must be between 5 and 25." :
    "Μη έγκυρη είσοδος: Ο αριθμός των κορυφών πρέπει να είναι μεταξύ 5 και 25.";

    const invalidEdgesMsg = currentLanguage === 'en' ?
    `Invalid input: Number of edges must be between ${vertices + 2} and ${maxEdges} for ${vertices} vertices.` :
    `Μη έγκυρη είσοδος: Ο αριθμός των ακμών πρέπει να είναι μεταξύ ${vertices + 2} και ${maxEdges} για ${vertices} κορυφές.`;

    const invalidWeightsMsg = currentLanguage === 'en' ?
    "Invalid input: Weights must be between 5 and 40." :
    "Μη έγκυρη είσοδος: Τα βάρη πρέπει να είναι μεταξύ 5 και 40.";

    const minGreaterThanMaxMsg = currentLanguage === 'en' ?
    "Invalid input: Minimum weight cannot be greater than maximum weight." :
    "Μη έγκυρη είσοδος: Το ελάχιστο βάρος δεν μπορεί να είναι μεγαλύτερο από το μέγιστο βάρος.";

    if (vertices < 5 || vertices > 25) {
    showErrorMessage(invalidVerticesMsg);
    return;
}
    if (edges < vertices + 2 || edges > maxEdges) {
    showErrorMessage(invalidEdgesMsg);
    return;
}
    if (minWeight < 5 || minWeight > 40 || maxWeight < 5 || maxWeight > 40) {
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
    $('#popup-title').text("Create Custom Level");
    $('#label-vertices').text("Number of Vertices:");
    $('#label-edges').text("Number of Edges:");
    $('#label-minWeight').text("Minimum Weight:");
    $('#label-maxWeight').text("Maximum Weight:");
    $('#playButton').text("Play");
} else {
    $('#popup-title').text("Δημιουργία Προσαρμοσμένου Επιπέδου");
    $('#label-vertices').text("Αριθμός Κορυφών:");
    $('#label-edges').text("Αριθμός Ακμών:");
    $('#label-minWeight').text("Ελάχιστο Βάρος:");
    $('#label-maxWeight').text("Μέγιστο Βάρος:");
    $('#playButton').text("Παίξε");
}
}

    $(document).ready(function() {
    $('#vertices, #edges, #minWeight, #maxWeight').on('input', checkInputs);
});