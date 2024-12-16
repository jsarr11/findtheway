// ui-utils.js

// ui-utils.js (or wherever updateActionTable is defined)
export function updateActionTable(actionHistory, actionTableId) {
    const actionTable = document.getElementById(actionTableId);
    actionTable.innerHTML = '<tr><th>Starting Vertex</th><th>Target Vertex</th><th>Weight</th></tr>';
    actionHistory.forEach(({ edge }) => {
        const formattedEdge = {
            Vertex1: edge.data('source'),
            Vertex2: edge.data('target'),
            Weight: edge.data('weight')
        };
        const row = document.createElement('tr');
        row.innerHTML = `<td>${formattedEdge.Vertex1}</td><td>${formattedEdge.Vertex2}</td><td>${formattedEdge.Weight}</td>`;
        actionTable.appendChild(row);
    });
}

export function hasOtherConnectedBlueEdges(node, cy) {
    const connectedEdges = node.connectedEdges();
    return connectedEdges.some(edge => edge.style('line-color') === 'rgb(0, 0, 255)');
}
