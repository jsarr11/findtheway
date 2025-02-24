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
    // console.log("%cFinding all possible MSTs...", "color: blue; font-weight: bold;");
    findAllMSTs([], includedNodes, edges);

    // console.log(`%cTotal MSTs found: ${mstResults.length}`, "color: red; font-weight: bold;");
    return mstResults;
}

/**
 * For Prim MSTs, generate ordering tables that preserve the original Prim order.
 * Each MST (an array of [u, v, w] edges) is converted into an array of objects:
 * { Vertex1, Vertex2, Weight } where Vertex1 is the smaller of the two.
 * Then, consecutive edges with equal weight are permuted.
 */
export function generateMSTOrderingTables(allMSTs) {
    // Helper: generate all permutations of an array.
    function permute(arr) {
        if (arr.length <= 1) return [arr];
        let results = [];
        for (let i = 0; i < arr.length; i++) {
            const rest = arr.slice(0, i).concat(arr.slice(i + 1));
            for (let perm of permute(rest)) {
                results.push([arr[i]].concat(perm));
            }
        }
        return results;
    }

    // For a given MST, generate ordering tables while preserving the given order.
    function generateOrderingsFromMST(mst) {
        // Convert each edge [u, v, w] into an object.
        // For Prim, we assume the MST is already in the order that Prim would add edges.
        // Do NOT sort the edges here.
        // For Prim, preserve the order in which edges were produced by primAllMSTs
        let edges = mst.map(([u, v, w]) => {
            let v1 = u + 1, v2 = v + 1;
            // Ensure canonical order per edge (smaller vertex first)
            if (v1 > v2) {
                [v1, v2] = [v2, v1];
            }
            return { Vertex1: v1, Vertex2: v2, Weight: w };
        });
// Do NOT sort—preserve the original Prim order!


        // Group consecutive edges that have the same weight.
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

        // Compute the cartesian product of the groups’ permutations.
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

    // Generate ordering tables for each MST.
    const result = [];
    allMSTs.forEach((mst, idx) => {
        const orderings = generateOrderingsFromMST(mst);
        console.log(`Prim MST #${idx + 1} produces ${orderings.length} ordering table(s):`);
        orderings.forEach((table, i) => {
            console.table(table);
        });
        result.push({ mstIndex: idx, orderings });
    });
    return result;
}
