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

    $('#weightsContainer').show();
    $('#playContainer').show();

    const vertices = parseInt($('#vertices').val());
    if (isNaN(vertices) || vertices < 4 || vertices > 12) {
        $('#weightsContainer').show(); // Make sure weights section appears right away
        $('#playContainer').hide();
        $('#edgesRangeDisplay').text(''); // Ensure it does not disappear

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

    // Generate the random edges number, but do NOT set language text here
    const mapping = edgesMapping[vertices];
    if (mapping) {
        const generatedEdges = Math.floor(Math.random() * (mapping.max - mapping.min + 1)) + mapping.min;
        $('#edges').val(generatedEdges);

        // Instead of setting #edgesRangeDisplay text directly, store the value in data
        $('#edgesRangeDisplay').data('edgesValue', generatedEdges);
    }

    checkInputs();

    // Move all translation logic to localizePopup
    localizePopup();
}



function generateValidEdges() {
    const vertices = parseInt($('#vertices').val());

    if (isNaN(vertices)) {
        $('#generatedEdgesDisplay').text('');
        return;
    }
    if (!(vertices in edgesMapping)) {
        const errMsg = localStorage.getItem('language') === 'en' ?
            'Invalid number of houses' :
            'Μη έγκυρος αριθμός σπιτιών';
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
    window.location.href = `/main-game-prim?level=${level}`;
}


function playCustomGame() {
    const currentLanguage = localStorage.getItem('language') || 'el';
    const vertices = parseInt($('#vertices').val());
    const edges = parseInt($('#edges').val());
    const minWeight = parseInt($('#minWeight').val());
    const maxWeight = parseInt($('#maxWeight').val());

    // Our custom edges mapping
    const edgesMapping = {
        4: { min: 4, max: 5 },
        5: { min: 5, max: 6 },
        6: { min: 6, max: 8 },
        7: { min: 7, max: 10 },
        8: { min: 8, max: 12 },
        9: { min: 9, max: 13 },
        10: { min: 10, max: 15 },
        11: { min: 11, max: 17 },
        12: { min: 12, max: 18 }
    };

    // Language-based messages
    const invalidVerticesMsg = (currentLanguage === 'en')
        ? "Invalid input: Number of houses must be between 4 and 12."
        : "Μη έγκυρη είσοδος: Ο αριθμός των σπιτιών πρέπει να είναι μεταξύ 4 και 12.";

    const invalidEdgesMsg = (minVal, maxVal) => (currentLanguage === 'en')
        ? `Invalid input: Number of pavements must be between ${minVal} and ${maxVal} for ${vertices} vertices.`
        : `Μη έγκυρη είσοδος: Ο αριθμός των πεζοδρομίων πρέπει να είναι μεταξύ ${minVal} και ${maxVal} για ${vertices} κορυφές.`;

    const invalidWeightsMsg = (currentLanguage === 'en')
        ? "Invalid input: Costs must be between 1 and 50."
        : "Μη έγκυρη είσοδος: Τα κόστη πρέπει να είναι μεταξύ 1 και 50.";

    const minGreaterThanMaxMsg = (currentLanguage === 'en')
        ? "Invalid input: Minimum cost cannot be greater than maximum weight."
        : "Μη έγκυρη είσοδος: Το ελάχιστο κόστος δεν μπορεί να είναι μεγαλύτερο από το μέγιστο κόστος.";

    // 1) Validate vertices
    if (vertices < 4 || vertices > 12) {
        showErrorMessage(invalidVerticesMsg);
        return;
    }

    // 2) Validate edges using our custom mapping
    const mapping = edgesMapping[vertices]; // e.g. {min:4, max:5} for vertices=4
    if (!mapping) {
        showErrorMessage(invalidVerticesMsg);
        return;
    }
    if (edges < mapping.min || edges > mapping.max) {
        showErrorMessage(invalidEdgesMsg(mapping.min, mapping.max));
        return;
    }

    // 3) Validate weights
    if (minWeight < 1 || minWeight > 50 || maxWeight < 1 || maxWeight > 50) {
        showErrorMessage(invalidWeightsMsg);
        return;
    }
    if (minWeight > maxWeight) {
        showErrorMessage(minGreaterThanMaxMsg);
        return;
    }

    // If all is valid, proceed
    window.location.href = `/main-game-prim?level=custom&vertices=${vertices}&edges=${edges}&minWeight=${minWeight}&maxWeight=${maxWeight}`;
}


function showErrorMessage(message) {
    $('#error-message').text(message).show();
}

function localizePopup() {
    const currentLanguage = localStorage.getItem('language') || 'el';

    // Update other popup texts
    if (currentLanguage === 'en') {
        $('#popup-title').text("Create custom level");
        $('#label-vertices').text("Number of houses:");
        $('#generateEdgesButton').text("Generate a valid number of edges");
        $('#label-minWeight').text("Min");
        $('#label-maxWeight').text("Max");
        $('#playButton').text("Let's go!");
        $('#p1').text("1. Give the number of houses, from 4 to 12");
        $('#p3').text("3. Give min and max weights you want, from 1 to 50");
    } else {
        $('#popup-title').text("Δημιουργία προσαρμοσμένου επιπέδου");
        $('#label-vertices').text("Αριθμός σπιτιών:");
        $('#generateEdgesButton').text("Παραγωγή έγκυρου αριθμού πεζοδρομίων");
        $('#label-minWeight').text("Ελάχιστο");
        $('#label-maxWeight').text("Μέγιστο");
        $('#playButton').text("Ας ξεκινήσουμε!");
        $('#p1').text("1. Δώσε αριθμό από σπίτια, από 4 μεχρι 12");
        $('#p3').text("3. Δώσε το ελάχιστο και μέγιστο κόστος που επιθυμείς, από 1 έως 50");
    }

    // Update the table headers, if the table is visible
    updateEdgesTableLanguage();

    // Now set the #edgesRangeDisplay text based on the stored edgesValue
    const edgesValue = $('#edgesRangeDisplay').data('edgesValue');
    if (edgesValue) {
        if (currentLanguage === 'el') {
            $('#edgesRangeDisplay')
                .text('2. Αριθμός πεζοδρομίων: ' + edgesValue)
                .append('<br>(Τυχαίος αριθμός μέσα στο επιτρεπόμενο όριο)');
        } else {
            $('#edgesRangeDisplay')
                .text('2. Number of pavements: ' + edgesValue)
                .append('<br>(Random number from the valid range)');
        }
    } else {
        // If there's no stored edges value, just clear the display
        $('#edgesRangeDisplay').text('');
    }
}


$(document).ready(function () {
    // Existing bindings for input events
    $('#vertices, #edges, #minWeight, #maxWeight').on('input', checkInputs);
    $('#vertices').on('input', updateEdgeConstraints);
    $('#generateEdgesButton').on('click', generateValidEdges);
});
