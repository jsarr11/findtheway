function showCustomLevelPopup() {
    $('#customLevelPopup').show();
    localizePopup();
}

function closeCustomLevelPopup() {
    $('#customLevelPopup').hide();
}

function updateEdgeConstraints() {
    const vertices = parseInt($('#vertices').val());
    // If vertices is not a number or out of range, hide the edges container
    if (isNaN(vertices) || vertices < 4 || vertices > 12) {
        $('#edgesContainer').hide();
        $('#edgesRangeDisplay').text('');
        // Also hide the next sections since nodes are invalid
        $('#weightsContainer').hide();
        $('#playContainer').hide();
        return;
    } else {
        $('#edgesContainer').show();
    }

    const minEdges = vertices + 2;
    const maxEdges = (vertices * (vertices - 1)) / 2;
    const lang = localStorage.getItem('language') || 'el';
    const rangeText = lang === 'en' ?
        'Valid number of edges: ' + minEdges + " - " + maxEdges :
        'Έγκυρος αριθμός ακμών: ' + minEdges + " - " + maxEdges;
    $('#edgesRangeDisplay').text(rangeText);
    checkInputs();
}



function generateValidEdges() {
    const vertices = parseInt($('#vertices').val());
    if (isNaN(vertices)) {
        $('#generatedEdgesDisplay').text('');
        return;
    }
    const minEdges = vertices + 2;
    const maxEdges = (vertices * (vertices - 1)) / 2;
    if (minEdges > maxEdges) {
        const errMsg = localStorage.getItem('language') === 'en' ? 'Invalid number of vertices' : 'Μη έγκυρος αριθμός κορυφών';
        $('#generatedEdgesDisplay').text(errMsg);
        return;
    }
    const generatedEdges = Math.floor(Math.random() * (maxEdges - minEdges + 1)) + minEdges;
    $('#edges').val(generatedEdges);
    const edgesLabel = localStorage.getItem('language') === 'en' ? 'Edges: ' : 'Ακμές: ';
    $('#generatedEdgesDisplay').text(edgesLabel + generatedEdges);

    // Reveal the weights section once edges are generated
    $('#weightsContainer').show();

    checkInputs();
}



function checkInputs() {
    const vertices = $('#vertices').val();
    const edges = $('#edges').val();
    const minWeight = $('#minWeight').val();
    const maxWeight = $('#maxWeight').val();

    // Show play button container only if all inputs are non-empty
    if (vertices && edges && minWeight && maxWeight) {
        $('#playContainer').show();
        $('#playButton').prop('disabled', false);
    } else {
        $('#playContainer').hide();
        $('#playButton').prop('disabled', true);
    }
}


function playGame(level) {
    const currentLanguage = localStorage.getItem('language') || 'el';
    const langSuffix = currentLanguage === 'en' ? 'en' : 'el';
    window.location.href = `/main-game-prim?level=${level}`;
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

    if (vertices < 4 || vertices > 12) {
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

    window.location.href = `/main-game-prim?level=custom&vertices=${vertices}&edges=${edges}&minWeight=${minWeight}&maxWeight=${maxWeight}`;
}

function showErrorMessage(message) {
    $('#error-message').text(message).show();
}

function localizePopup() {
    const currentLanguage = localStorage.getItem('language') || 'el';

    if (currentLanguage === 'en') {
        $('#popup-title').text("Create custom level");
        $('#label-vertices').text("Number of vertices:");
        $('#generateEdgesButton').text("Generate a valid number of edges");
        $('#label-minWeight').text("Min");
        $('#label-maxWeight').text("Max");
        $('#playButton').text("Play");
        $('#p1').text("1. Give the number of houses, from 4 to 12");
        $('#p2').text("2. Push the button to generate a random number of pavements");
        $('#p3').text("3. Give min and max weights you want, from 1 to 50");
    } else {
        $('#popup-title').text("Δημιουργία προσαρμοσμένου επιπέδου");
        $('#label-vertices').text("Αριθμός κορυφών:");
        $('#generateEdgesButton').text("Παραγωγή έγκυρου αριθμού ακμών");
        $('#label-minWeight').text("Ελάχιστο");
        $('#label-maxWeight').text("Μέγιστο");
        $('#playButton').text("Παίξε");
        $('#p1').text("1. Δώσε τον από σπίτια, από 4 μεχρι 12");
        $('#p2').text("2. Πάτησε το κουμπί για να δημιουργηθεί ένας τυχαίος αριθμός πεζοδρομίων");
        $('#p3').text("3. Δώσε το ελάχιστο και μέγιστο βάρος που επιθυμείς, από 1 έως 50");
    }
}

$(document).ready(function () {
    // Existing bindings for input events
    $('#vertices, #edges, #minWeight, #maxWeight').on('input', checkInputs);
    $('#vertices').on('input', updateEdgeConstraints);
    $('#generateEdgesButton').on('click', generateValidEdges);
});
