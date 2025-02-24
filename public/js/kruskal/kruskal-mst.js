export function kruskalAllMSTs(adjacencyMatrix) {
    const numVertices = adjacencyMatrix.length;
    let mstResults = [];
    let minWeightSum = Infinity;

    function find(parent, i) {
        if (parent[i] === i) return i;
        return parent[i] = find(parent, parent[i]); // Path compression
    }

    function union(parent, rank, x, y) {
        const rootX = find(parent, x);
        const rootY = find(parent, y);
        if (rootX !== rootY) {
            if (rank[rootX] < rank[rootY]) {
                parent[rootX] = rootY;
            } else if (rank[rootX] > rank[rootY]) {
                parent[rootY] = rootX;
            } else {
                parent[rootY] = rootX;
                rank[rootX]++;
            }
        }
    }

    function kruskalMST(edges, currentMST, edgeIndex, numEdgesIncluded, parent, rank, currentWeightSum) {
        if (numEdgesIncluded === numVertices - 1) {
            if (currentWeightSum < minWeightSum) {
                minWeightSum = currentWeightSum;
                mstResults = [[...currentMST]];
            } else if (currentWeightSum === minWeightSum) {
                mstResults.push([...currentMST]);
            }
            return;
        }

        for (let i = edgeIndex; i < edges.length; i++) {
            const weight = edges[i][2];
            let tiedEdges = [];

            // Collect all edges with the same weight (ensures proper tie-handling)
            while (i < edges.length && edges[i][2] === weight) {
                tiedEdges.push(edges[i]);
                i++;
            }

            // Explore all tied edges separately (ensuring strict order)
            for (const [u, v, w] of tiedEdges) {
                const rootU = find(parent, u);
                const rootV = find(parent, v);

                if (rootU !== rootV) {
                    // Copy parent and rank arrays for backtracking
                    const parentCopy = [...parent];
                    const rankCopy = [...rank];
                    union(parentCopy, rankCopy, u, v);

                    kruskalMST(edges, [...currentMST, [u, v, w]], i, numEdgesIncluded + 1, parentCopy, rankCopy, currentWeightSum + w);
                }
            }

            // **Force exploring all tie-breaking paths before moving forward**
            if (tiedEdges.length > 1) {
                for (const [u, v, w] of tiedEdges) {
                    const rootU = find(parent, u);
                    const rootV = find(parent, v);

                    if (rootU !== rootV) {
                        // Copy parent and rank arrays for backtracking
                        const parentCopy = [...parent];
                        const rankCopy = [...rank];
                        union(parentCopy, rankCopy, u, v);

                        kruskalMST(edges, [...currentMST, [u, v, w]], edgeIndex, numEdgesIncluded + 1, parentCopy, rankCopy, currentWeightSum + w);
                    }
                }
            }
        }
    }

    // Convert adjacency matrix to an edge list
    const edges = [];
    for (let u = 0; u < numVertices; u++) {
        for (let v = u + 1; v < numVertices; v++) {
            if (adjacencyMatrix[u][v] !== 0) {
                edges.push([u, v, adjacencyMatrix[u][v]]);
            }
        }
    }

    // **Ensure edges are sorted by weight before starting (Kruskal’s rule)**
    edges.sort((a, b) => a[2] - b[2]);

    const parent = Array(numVertices).fill(0).map((_, i) => i);
    const rank = Array(numVertices).fill(0);

    console.log("%cFinding all possible MSTs using Kruskal's Algorithm...", "color: blue; font-weight: bold;");
    kruskalMST(edges, [], 0, 0, parent, rank, 0);

    console.log(`%cTotal MSTs found: ${mstResults.length}`, "color: red; font-weight: bold;");
    mstResults.forEach((mst, index) => {
        console.log(`%cMST ${index + 1}:`, "color: green; font-weight: bold;");
        console.table(mst.map(edge => ({
            "Source": edge[0] + 1,
            "Target": edge[1] + 1,
            "Weight": edge[2]
        })));
    });

    return mstResults;
}
