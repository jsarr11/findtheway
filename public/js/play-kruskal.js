function showCustomLevelPopup() {
    $('#customLevelPopup').show();
    localizePopup();
}

function closeCustomLevelPopup() {
    $('#customLevelPopup').hide();
}

const edgesMapping = {
    4: {min: 4, max: 5},
    5: {min: 5, max: 6},
    6: {min: 6, max: 8},
    7: {min: 7, max: 10},
    8: {min: 8, max: 12},
    9: {min: 9, max: 13},
    10: {min: 10, max: 15},
    11: {min: 11, max: 17},
    12: {min: 12, max: 18}
};

function updateEdgesTableLanguage() {
    const lang = localStorage.getItem('language') || 'el';
    let headerNodes, headerMin, headerMax;
    if (lang === 'en') {
        headerNodes = "Nodes";
        headerMin = "Min Edges";
        headerMax = "Max Edges";
    } else {
        headerNodes = "Κορυφές";
        headerMin = "Ελάχιστες ακμές";
        headerMax = "Μέγιστες ακμές";
    }
    // Update the header if the table exists in the edges display container
    if ($('#edgesRangeDisplay table').length) {
        $('#edgesRangeDisplay table thead tr').html(`
            <th>${headerNodes}</th>
            <th>${headerMin}</th>
            <th>${headerMax}</th>
        `);
    }
}


function updateEdgeConstraints() {
    // Reset all fields and hide lower sections
    $('#edges').val('');
    $('#generatedEdgesDisplay').text('');
    $('#minWeight').val('');
    $('#maxWeight').val('');
    $('#error-message').hide();

    $('#edgesContainer').hide();
    $('#weightsContainer').hide();
    $('#playContainer').hide();

    const vertices = parseInt($('#vertices').val());
    if (isNaN(vertices) || vertices < 4 || vertices > 12) {
        $('#edgesContainer').hide();
        $('#edgesRangeDisplay').html('');
        $('#weightsContainer').hide();
        $('#playContainer').hide();
        return;
    } else {
        $('#edgesContainer').show();
    }

    // Get current language
    const lang = localStorage.getItem('language') || 'el';
    // Set table header texts based on language
    let headerNodes, headerMin, headerMax;
    if (lang === 'en') {
        headerNodes = "Nodes";
        headerMin = "Min Edges";
        headerMax = "Max Edges";
    } else {
        headerNodes = "Κορυφές";
        headerMin = "Ελάχιστες ακμές";
        headerMax = "Μέγιστες ακμές";
    }

    // Build a table showing only the row for the entered node count using the language-specific headers
    const mapping = edgesMapping[vertices];
    const tableHtml = `
      <table id="edgesTable" style="width:100%; border-collapse:collapse;">
        <thead>
          <tr>
            <th>${headerNodes}</th>
            <th>${headerMin}</th>
            <th>${headerMax}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${vertices}</td>
            <td>${mapping.min}</td>
            <td>${mapping.max}</td>
          </tr>
        </tbody>
      </table>
    `;
    $('#edgesRangeDisplay').html(tableHtml);

    checkInputs();
}


function generateValidEdges() {
    const vertices = parseInt($('#vertices').val());
    if (isNaN(vertices)) {
        $('#generatedEdgesDisplay').text('');
        return;
    }
    if (!(vertices in edgesMapping)) {
        const errMsg = localStorage.getItem('language') === 'en'
            ? 'Invalid number of vertices'
            : 'Μη έγκυρος αριθμός κορυφών';
        $('#generatedEdgesDisplay').text(errMsg);
        return;
    }
    const mapping = edgesMapping[vertices];
    const minEdges = mapping.min;
    const maxEdges = mapping.max;
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
    window.location.href = `/main-game-kruskal?level=${level}`;
}

function playCustomGame() {
    const currentLanguage = localStorage.getItem('language') || 'el';
    const vertices = parseInt($('#vertices').val());
    const edges = parseInt($('#edges').val());
    const minWeight = parseInt($('#minWeight').val());
    const maxWeight = parseInt($('#maxWeight').val());

    const mapping = edgesMapping[vertices];

    const invalidVerticesMsg = currentLanguage === 'en'
        ? "Invalid input: Number of vertices must be between 4 and 12."
        : "Μη έγκυρη είσοδος: Ο αριθμός των κορυφών πρέπει να είναι μεταξύ 4 και 12.";

    const invalidEdgesMsg = currentLanguage === 'en'
        ? `Invalid input: Number of edges must be between ${mapping.min} and ${mapping.max} for ${vertices} vertices.`
        : `Μη έγκυρη είσοδος: Ο αριθμός των ακμών πρέπει να είναι μεταξύ ${mapping.min} και ${mapping.max} για ${vertices} κορυφές.`;

    const invalidWeightsMsg = currentLanguage === 'en'
        ? "Invalid input: Weights must be between 1 and 50."
        : "Μη έγκυρη είσοδος: Τα βάρη πρέπει να είναι μεταξύ 1 και 50.";

    const minGreaterThanMaxMsg = currentLanguage === 'en'
        ? "Invalid input: Minimum weight cannot be greater than maximum weight."
        : "Μη έγκυρη είσοδος: Το ελάχιστο βάρος δεν μπορεί να είναι μεγαλύτερο από το μέγιστο βάρος.";

    if (vertices < 4 || vertices > 12) {
        showErrorMessage(invalidVerticesMsg);
        return;
    }
    if (edges < mapping.min || edges > mapping.max) {
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

    // Update the table headers, if the table is visible
    updateEdgesTableLanguage();
}

$(document).ready(function () {
    $('#vertices, #edges, #minWeight, #maxWeight').on('input', checkInputs);
    $('#vertices').on('input', updateEdgeConstraints);
    $('#generateEdgesButton').on('click', generateValidEdges);
});
