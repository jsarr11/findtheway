export function kruskalAllMSTs(adjacencyMatrix) {
    const numVertices = adjacencyMatrix.length;
    let mstResults = [];
    let minWeightSum = Infinity; // Keep track of the minimum weight sum encountered

    function find(parent, i) {
        if (parent[i] === i) return i;
        return find(parent, parent[i]);
    }

    function union(parent, rank, x, y) {
        const rootX = find(parent, x);
        const rootY = find(parent, y);

        if (rank[rootX] < rank[rootY]) {
            parent[rootX] = rootY;
        } else if (rank[rootX] > rank[rootY]) {
            parent[rootY] = rootX;
        } else {
            parent[rootY] = rootX;
            rank[rootX]++;
        }
    }

    function kruskalMST(edges, currentMST, edgeIndex, numEdgesIncluded, parent, rank, currentWeightSum) {
        if (numEdgesIncluded === numVertices - 1) {
            // If this MST has a smaller weight sum, store it
            if (currentWeightSum < minWeightSum) {
                minWeightSum = currentWeightSum;
                mstResults = [ [...currentMST] ]; // Store only the best MST found so far
            } else if (currentWeightSum === minWeightSum) {
                // If the weight sum matches the minimum, add to the list
                mstResults.push([ ...currentMST ]);
            }
            return;
        }

        if (edgeIndex === edges.length) return;

        const [u, v, weight] = edges[edgeIndex];
        const rootU = find(parent, u);
        const rootV = find(parent, v);

        // Only add the edge if it doesn't form a cycle
        if (rootU !== rootV) {
            union(parent, rank, rootU, rootV);
            kruskalMST(edges, [...currentMST, [u, v, weight]], edgeIndex + 1, numEdgesIncluded + 1, parent, rank, currentWeightSum + weight);
            parent[rootU] = rootU;
            parent[rootV] = rootV;
        }

        // Continue the recursive search without adding the current edge
        kruskalMST(edges, currentMST, edgeIndex + 1, numEdgesIncluded, parent, rank, currentWeightSum);
    }

    const edges = [];
    for (let u = 0; u < numVertices; u++) {
        for (let v = u + 1; v < numVertices; v++) {
            if (adjacencyMatrix[u][v] !== 0) {
                edges.push([u, v, adjacencyMatrix[u][v]]);
            }
        }
    }
    edges.sort((a, b) => a[2] - b[2]); // Sort edges by weight

    const parent = Array(numVertices).fill(0).map((_, i) => i);
    const rank = Array(numVertices).fill(0);

    kruskalMST(edges, [], 0, 0, parent, rank, 0);

    // Log the MST with the smallest weight sum
    console.log("Minimum spanning tree(s) using Kruskal's algorithm:");
    mstResults.forEach((mst, index) => {
        console.log(`MST ${index + 1}:`);
        mst.forEach(edge => {
            console.log(`Source: ${edge[0] + 1}, Target: ${edge[1] + 1}, Weight: ${edge[2]}`);
        });
    });

    return mstResults;
}
