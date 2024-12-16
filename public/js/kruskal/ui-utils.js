// ui-utils-kruskal.js

// ui-utils.js (adjustment)
export function updateActionTable(actionHistory, actionTableId) {
    const actionTable = document.getElementById(actionTableId);
    actionTable.innerHTML = '<tr><th>Vertices</th><th>Weight</th></tr>'; // Adjust headers as needed
    actionHistory.forEach(({ edge }) => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${edge.data('source')}-${edge.data('target')}</td><td>${edge.data('weight')}</td>`;
        actionTable.appendChild(row);
    });
}

