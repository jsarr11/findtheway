// ui-utils.js

export function updateActionTable(actionHistory, actionTableId) {
    const actionTable = document.getElementById(actionTableId);
    if (!actionTable) return; // safety check

    // Αν δεν υπάρχουν επιλεγμένες ακμές, κρύβουμε εντελώς τον πίνακα.
    if (actionHistory.length === 0) {
        actionTable.innerHTML = '';
        actionTable.style.display = 'none';
        return;
    }

    // Δείχνουμε τον πίνακα
    actionTable.style.display = 'table';

    // Ελέγχουμε τρέχουσα γλώσσα:
    const currentLanguage = localStorage.getItem('language') || 'el';

    // Διαμορφώνουμε τις επικεφαλίδες αναλόγως
    let headerRow;
    if (currentLanguage === 'en') {
        headerRow = `
            <tr>
                <th>starting house</th>
                <th>target house</th>
                <th>cost</th>
            </tr>
        `;
    } else {
        headerRow = `
            <tr>
                <th>αρχικό σπίτι</th>
                <th>επόμενο σπίτι</th>
                <th>κόστος</th>
            </tr>
        `;
    }

    // Ενσωματώνουμε την πρώτη γραμμή κεφαλίδας
    actionTable.innerHTML = headerRow;

    // Προσθέτουμε τις γραμμές για καθεμία ακμή στο actionHistory
    actionHistory.forEach(({ edge }) => {
        const row = document.createElement('tr');
        const startingVertex = edge.data('source');
        const targetVertex = edge.data('target');
        const weight = edge.data('weight');
        row.innerHTML = `
            <td>${startingVertex}</td>
            <td>${targetVertex}</td>
            <td>${weight}</td>
        `;
        actionTable.appendChild(row);
    });
}


export function hasOtherConnectedBlueEdges(node, cy) {
    const connectedEdges = node.connectedEdges();
    return connectedEdges.some(edge => edge.style('line-color') === 'rgb(0, 0, 255)');
}
