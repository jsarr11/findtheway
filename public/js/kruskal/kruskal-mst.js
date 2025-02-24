export function kruskalAllMSTs(adjacencyMatrix) {
    const n = adjacencyMatrix.length;
    // Build + sort edges by ascending weight
    const edges = [];
    for (let u = 0; u < n; u++) {
        for (let v = u + 1; v < n; v++) {
            const w = adjacencyMatrix[u][v];
            if (w !== 0) {
                edges.push([u, v, w]);
            }
        }
    }
    edges.sort((a, b) => a[2] - b[2]);

    let bestWeight = Infinity;
    let allMSTs = [];

    // Basic Union-Find
    function find(parent, x) {
        if (parent[x] === x) return x;
        return (parent[x] = find(parent, parent[x]));
    }

    function union(parent, rank, x, y) {
        const rx = find(parent, x);
        const ry = find(parent, y);
        if (rx !== ry) {
            if (rank[rx] < rank[ry]) {
                parent[rx] = ry;
            } else if (rank[rx] > rank[ry]) {
                parent[ry] = rx;
            } else {
                parent[ry] = rx;
                rank[rx]++;
            }
            return true;
        }
        return false;
    }

    /**
     * backtrack
     * @param {number} idx - index into 'edges'
     * @param {Array} mstSoFar - edges chosen so far
     * @param {number} used - how many edges chosen
     * @param {number} currWeight - sum of chosen edges
     * @param {Array} parent - union-find parent
     * @param {Array} rank - union-find rank
     */
    function backtrack(idx, mstSoFar, used, currWeight, parent, rank) {
        // If we have a spanning tree
        if (used === n - 1) {
            // If it's better than anything so far, reset
            if (currWeight < bestWeight) {
                bestWeight = currWeight;
                allMSTs = [];
            }
            // If it matches bestWeight, store it
            if (currWeight === bestWeight) {
                // Sort edges for consistent logging
                const sortedEdges = [...mstSoFar].sort((a, b) => a[2] - b[2]);
                allMSTs.push(sortedEdges);
            }
            return;
        }

        // If no more edges, or if current weight is already >= bestWeight, no point continuing
        if (idx >= edges.length || currWeight >= bestWeight) return;

        // Gather all edges of the same weight => tie
        const w = edges[idx][2];
        const tieGroup = [];
        let i = idx;
        while (i < edges.length && edges[i][2] === w) {
            tieGroup.push(edges[i]);
            i++;
        }

        // For each edge in this tie group: try picking it if no cycle
        for (const [u, v, weight] of tieGroup) {
            const pCopy = [...parent];
            const rCopy = [...rank];
            if (union(pCopy, rCopy, u, v)) {
                backtrack(
                    i,  // skip rest of tie group, move on
                    [...mstSoFar, [u, v, weight]],
                    used + 1,
                    currWeight + weight,
                    pCopy,
                    rCopy
                );
            }
        }
        // Also skip entire tie group
        backtrack(i, mstSoFar, used, currWeight, parent, rank);
    }

    // Initialize union-find
    const parent = Array(n).fill(0).map((_, i) => i);
    const rank = Array(n).fill(0);

    // Start recursion
    backtrack(0, [], 0, 0, parent, rank);

    // Log results
    console.log("Minimal MST weight:", bestWeight);
    console.log("Number of MSTs:", allMSTs.length);
    allMSTs.forEach((mst, idx) => {
        console.log(`MST #${idx + 1}`);
        console.table(mst.map(([u, v, w]) => ({
            Source: u + 1,
            Target: v + 1,
            Weight: w
        })));
    });

    return allMSTs;
}
