// ui-utils-kruskal.js

export function updateActionTable(actionHistory, actionTableId) {
    const actionTable = document.getElementById(actionTableId);
    if (!actionTable) return;

    // If no edges => hide the table
    if (actionHistory.length === 0) {
        actionTable.innerHTML = '';
        actionTable.style.display = 'none';
        return;
    }

    // Show the table
    actionTable.style.display = 'table';
    actionTable.innerHTML = `
        <tr>
          <th>Starting Vertex</th>
          <th>Target Vertex</th>
          <th>Weight</th>
        </tr>
    `;

    // Append rows
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
