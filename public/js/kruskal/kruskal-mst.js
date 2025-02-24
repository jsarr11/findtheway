export function kruskalAllMSTs(adjacencyMatrix) {
    const n = adjacencyMatrix.length;

    // 1) Build edges list
    const edges = [];
    for (let u = 0; u < n; u++) {
        for (let v = u + 1; v < n; v++) {
            const w = adjacencyMatrix[u][v];
            if (w !== 0) {
                edges.push([u, v, w]);
            }
        }
    }
    // 2) Sort edges by ascending weight
    edges.sort((a, b) => a[2] - b[2]);

    let bestWeight = Infinity;
    let allMSTs = [];

    // ----- Union-Find
    function findUF(parent, x) {
        if (parent[x] === x) return x;
        parent[x] = findUF(parent, parent[x]);
        return parent[x];
    }

    function unionUF(parent, rank, x, y) {
        const rx = findUF(parent, x);
        const ry = findUF(parent, y);
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
     * backtrackKruskal
     * @param {number} idx - index of current edge in 'edges'
     * @param {Array} mstSoFar - edges chosen so far
     * @param {number} used - how many edges chosen
     * @param {number} sumW - sum of chosen edges so far
     * @param {Array} parent - union-find parent
     * @param {Array} rank - union-find rank
     */
    function backtrackKruskal(idx, mstSoFar, used, sumW, parent, rank) {
        // If MST complete => used==n-1
        if (used === n - 1) {
            if (sumW < bestWeight) {
                bestWeight = sumW;
                allMSTs = [];
            }
            if (sumW === bestWeight) {
                // Sort the MST edges by ascending weight for better readability
                const sortedMST = [...mstSoFar].sort((a, b) => a[2] - b[2]);
                allMSTs.push(sortedMST);
            }
            return;
        }

        // If we've consumed all edges or sumW already >= bestWeight, no need to proceed
        if (idx >= edges.length || sumW >= bestWeight) return;

        // ----- 1) Try picking the current edge (if it doesn’t form a cycle)
        const [u, v, w] = edges[idx];
        // Copy union-find
        const copyParent = [...parent];
        const copyRank = [...rank];
        if (unionUF(copyParent, copyRank, u, v)) {
            backtrackKruskal(
                idx + 1,
                [...mstSoFar, [u, v, w]],
                used + 1,
                sumW + w,
                copyParent,
                copyRank
            );
        }

        // ----- 2) Also skip the current edge
        backtrackKruskal(idx + 1, mstSoFar, used, sumW, parent, rank);
    }

    // Setup union-find
    const parent = Array(n).fill(0).map((_, i) => i);
    const rank = Array(n).fill(0);

    // console.log("%cFinding all MSTs by picking or skipping each edge in ascending order...", "color: blue; font-weight: bold;");
    backtrackKruskal(0, [], 0, 0, parent, rank);

    // Print final MST results
    if (bestWeight === Infinity) {
        // console.log("%cNo MST found. Graph is likely disconnected.", "color: red; font-weight: bold;");
    } else {
        // console.log(`Minimal MST weight: ${bestWeight}`);
        // console.log(`Number of MSTs: ${allMSTs.length}`);
        allMSTs.forEach((mst, idx) => {
            console.log(`MST #${idx + 1}`);
            console.table(mst.map(([u, v, w]) => ({
                Source: u + 1,
                Target: v + 1,
                Weight: w
            })));
        });
    }

    return allMSTs;
}

// ... [existing code in kruskal-mst.js remains unchanged]

export function generateMSTOrderingTables(allMSTs) {
    // For each MST (an array of [u, v, w]), generate all valid ordering tables
    // that account for ties (edges with the same weight) by permuting tied groups.
    function permute(arr) {
        if (arr.length <= 1) return [arr];
        let results = [];
        for (let i = 0; i < arr.length; i++) {
            let rest = arr.slice(0, i).concat(arr.slice(i + 1));
            for (let perm of permute(rest)) {
                results.push([arr[i]].concat(perm));
            }
        }
        return results;
    }

    // For each MST, convert each edge to an object with 1-based numbering,
    // then sort by weight and group edges with the same weight.
    function generateOrderingsFromMST(mst) {
        // Convert edges: [u,v,w] → {Vertex1, Vertex2, Weight} with 1-based vertices
        let edges = mst.map(([u, v, w]) => ({
            Vertex1: u + 1,
            Vertex2: v + 1,
            Weight: w
        }));
        // Sort by Weight (ascending)
        edges.sort((a, b) => a.Weight - b.Weight);

        // Group edges with the same weight (consecutive ones)
        const groups = [];
        let currentGroup = [];
        for (let edge of edges) {
            if (currentGroup.length === 0 || currentGroup[0].Weight === edge.Weight) {
                currentGroup.push(edge);
            } else {
                groups.push(currentGroup);
                currentGroup = [edge];
            }
        }
        if (currentGroup.length > 0) groups.push(currentGroup);

        // For each group, generate all permutations.
        const groupPermutations = groups.map(group => permute(group));

        // Compute the cartesian product of the groups' permutations
        function cartesianProduct(arrays) {
            return arrays.reduce((acc, curr) => {
                const temp = [];
                acc.forEach(a => {
                    curr.forEach(b => {
                        temp.push(a.concat(b));
                    });
                });
                return temp;
            }, [[]]);
        }

        return cartesianProduct(groupPermutations);
    }

    // Now generate ordering tables for each MST.
    // We return an array of objects: { mstIndex, orderings }
    const result = [];
    allMSTs.forEach((mst, idx) => {
        const orderings = generateOrderingsFromMST(mst);
        // For debugging, you could log:
        console.log(`MST #${idx + 1} produces ${orderings.length} ordering table(s):`);
        orderings.forEach((table, i) => {
            console.table(table);
        });
        result.push({ mstIndex: idx, orderings });
    });
    return result;
}
