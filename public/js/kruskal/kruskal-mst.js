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
                const [u, v, weight] = edges[i];
                const rootU = find(parent, u);
                const rootV = find(parent, v);

                if (rootU !== rootV) {
                    const parentCopy = [...parent];
                    const rankCopy = [...rank];
                    union(parent, rank, u, v);

                    kruskalMST(edges, [...currentMST, [u, v, weight]], i + 1, numEdgesIncluded + 1, [...parent], [...rank], currentWeightSum + weight);

                    parent = parentCopy;
                    rank = rankCopy;
                }
            }
        }

        const edges = [];
        for (let u = 0; u < numVertices; u++) {
            for (let v = u + 1; v < numVertices; v++) {
                if (adjacencyMatrix[u][v] !== 0) {
                    edges.push([u, v, adjacencyMatrix[u][v]]);
                }
            }
        }
        edges.sort((a, b) => a[2] - b[2]);

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
