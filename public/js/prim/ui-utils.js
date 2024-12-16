// ui-utils.js

export function updateActionTable(actionHistory, actionTableId) {
    const actionTable = document.getElementById(actionTableId);
    actionTable.innerHTML = '<tr><th>Starting Vertex</th><th>Target Vertex</th><th>Weight</th></tr>';
    actionHistory.forEach(({ edge }) => {
        const row = document.createElement('tr');
        const startingVertex = edge.data('source');
        const targetVertex = edge.data('target');
        const weight = edge.data('weight');
        row.innerHTML = `<td>${startingVertex}</td><td>${targetVertex}</td><td>${weight}</td>`;
        actionTable.appendChild(row);
    });
}


export function hasOtherConnectedBlueEdges(node, cy) {
    const connectedEdges = node.connectedEdges();
    return connectedEdges.some(edge => edge.style('line-color') === 'rgb(0, 0, 255)');
}
