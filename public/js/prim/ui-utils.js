// ui-utils.js

export function updateActionTable(actionHistory, actionTableId) {
    const actionTable = document.getElementById(actionTableId);
    if (!actionTable) return; // safety check in case ID wasn't found

    // If empty => hide the entire table
    if (actionHistory.length === 0) {
        actionTable.innerHTML = '';            // no header row
        actionTable.style.display = 'none';    // hide
        return;
    }

    // Otherwise show the table
    actionTable.style.display = 'table';       // or 'block'
    // Rebuild the header row
    actionTable.innerHTML = `
        <tr>
          <th>Starting Vertex</th>
          <th>Target Vertex</th>
          <th>Weight</th>
        </tr>
    `;

    // Populate rows
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
