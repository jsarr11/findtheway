export function primAllMSTs(adjacencyMatrix, startingNodeId) {
    const numVertices = adjacencyMatrix.length;
    const mstResults = [];

    function findAllMSTs(currentMST, includedNodes, availableEdges) {
        // If we have numVertices - 1 edges, store the MST
        if (currentMST.length === numVertices - 1) {
            mstResults.push([...currentMST]);

            console.log(`%cMST ${mstResults.length}:`, "color: green; font-weight: bold;");
            console.table(currentMST.map(edge => ({
                "Source": edge[0] + 1,
                "Target": edge[1] + 1,
                "Weight": edge[2]
            })));

            return;
        }

        // Get all edges that connect an included node to an excluded node
        let nextEdges = availableEdges.filter(edge =>
            includedNodes.has(edge[0]) !== includedNodes.has(edge[1])
        );

        if (nextEdges.length === 0) return; // No valid edges left

        // Sort edges by weight (ascending order)
        nextEdges.sort((a, b) => a[2] - b[2]);

        // Get all edges that have the smallest weight
        const minWeight = nextEdges[0][2];
        const candidateEdges = nextEdges.filter(edge => edge[2] === minWeight);

        for (const edge of candidateEdges) {
            const [u, v, weight] = edge;

            // Ensure we don't form a cycle by using a Union-Find data structure
            if (formsCycle(currentMST, u, v)) continue;

            // Create new states
            const newIncluded = new Set(includedNodes);
            newIncluded.add(u);
            newIncluded.add(v);

            const newMST = [...currentMST, edge];
            const newAvailableEdges = availableEdges.filter(e => e !== edge);

            // Recur with updated MST and available edges
            findAllMSTs(newMST, newIncluded, newAvailableEdges);
        }
    }

    // Function to check if adding an edge would form a cycle (Union-Find)
    function formsCycle(mst, u, v) {
        const parent = Array(numVertices).fill(null);

        function find(x) {
            if (parent[x] === null) return x;
            return parent[x] = find(parent[x]);
        }

        function union(x, y) {
            const rootX = find(x);
            const rootY = find(y);
            if (rootX !== rootY) parent[rootY] = rootX;
        }

        // Construct union-find structure from MST
        for (let [a, b] of mst) {
            union(a, b);
        }

        return find(u) === find(v); // True if adding (u, v) forms a cycle
    }

    // Parse the adjacency matrix into an edge list
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
    const includedNodes = new Set([startIndex]);

    // Begin recursion
    console.log("%cFinding all possible MSTs...", "color: blue; font-weight: bold;");
    findAllMSTs([], includedNodes, edges);

    console.log(`%cTotal MSTs found: ${mstResults.length}`, "color: red; font-weight: bold;");
    return mstResults;
}
