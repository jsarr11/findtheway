export function isEdgeInTable(actionHistory, edgeId) {
    return actionHistory.some(({ edge }) => edge.id() === edgeId);
}

export function isNodeInTable(actionHistory, nodeId) {
    return actionHistory.some(({ sourceNode, targetNode }) => sourceNode.id() === nodeId || targetNode.id() === nodeId);
}

// Function to log adjacency matrix
export function logAdjacencyMatrix(adjacencyMatrix) {
    console.log("Adjacency Matrix:");
    adjacencyMatrix.forEach(row => console.log(row.join(' ')));
}

// Function to normalize edges
export function normalizeEdges(edges) {
    return edges.map(edge =>
        edge.Vertex1 < edge.Vertex2
            ? edge
            : { Vertex1: edge.Vertex2, Vertex2: edge.Vertex1, Weight: edge.Weight }
    ).sort((a, b) => a.Vertex1 - b.Vertex1 || a.Vertex2 - b.Vertex2);
}

export function hideSubmitLineOnClick(buttonIds) {
    $(buttonIds).click(function () {
        $('.submit-line').css('display', 'none');
    });
}
