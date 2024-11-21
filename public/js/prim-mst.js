export function primAllMSTs(adjacencyMatrix, startingNodeId) {
    const numVertices = adjacencyMatrix.length;
    const mstResults = [];

    function primMST(included, availableEdges, currentMST) {
        // If we have numVertices - 1 edges, it's a valid MST
        if (currentMST.length === numVertices - 1) {
            mstResults.push([...currentMST]);
            return;
        }

        // Filter edges that connect an included vertex to an excluded one
        const nextEdges = availableEdges.filter(edge => included[edge[0]] !== included[edge[1]]);
        nextEdges.sort((a, b) => a[2] - b[2]); // Sort by weight

        // Consider edges with the smallest weight (ties included)
        const minWeight = nextEdges[0]?.[2]; // Get the smallest weight
        const candidateEdges = nextEdges.filter(edge => edge[2] === minWeight);

        for (const edge of candidateEdges) {
            const [u, v, weight] = edge;

            // Update the included nodes and MST
            const newIncluded = [...included];
            newIncluded[u] = true;
            newIncluded[v] = true;

            const newMST = [...currentMST, edge];

            // Recursively proceed with the new state
            primMST(newIncluded, availableEdges, newMST);
        }
    }

    // Parse the adjacency matrix into an edge list
    const included = Array(numVertices).fill(false);
    const edges = [];

    for (let u = 0; u < numVertices; u++) {
        for (let v = u + 1; v < numVertices; v++) {
            if (adjacencyMatrix[u][v] !== 0) {
                edges.push([u, v, adjacencyMatrix[u][v]]);
            }
        }
    }

    // Start from the given starting node
    const startIndex = startingNodeId - 1;
    included[startIndex] = true;

    // Begin recursion
    primMST(included, edges, []);

    // Log all MSTs
    console.log("All possible MSTs:");
    mstResults.forEach((mst, index) => {
        console.log(`MST ${index + 1}:`);
        mst.forEach(edge => {
            console.log(`Source: ${edge[0] + 1}, Target: ${edge[1] + 1}, Weight: ${edge[2]}`);
        });
    });

    return mstResults;
}
