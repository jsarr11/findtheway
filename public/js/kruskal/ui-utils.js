// ui-utils-kruskal.js

export function updateActionTable(actionHistory, actionTableId) {
    const actionTable = document.getElementById(actionTableId);
    if (!actionTable) return;

    if (actionHistory.length === 0) {
        actionTable.innerHTML = '';
        actionTable.style.display = 'none';
        return;
    }

    actionTable.style.display = 'table';

    // Ελέγχουμε τρέχουσα γλώσσα
    const currentLanguage = localStorage.getItem('language') || 'el';

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

    actionTable.innerHTML = headerRow;

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

