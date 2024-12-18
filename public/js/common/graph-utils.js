export function createGraph(level, vertices, edgesCount, minWeight, maxWeight) {
    const levelConfig = {
        beginner: { vertices: 5, edges: 6, minWeight: 1, maxWeight: 16 },
        intermediate: { vertices: 7, edges: 9, minWeight: 1, maxWeight: 16 },
        expert: { vertices: 10, edges: 14, minWeight: 1, maxWeight: 16 },
        custom: { vertices: vertices, edges: edgesCount, minWeight: minWeight, maxWeight: maxWeight }
    };

    const config = levelConfig[level] || levelConfig.beginner;

    const nodes = [];
    for (let i = 0; i < config.vertices; i++) {
        nodes.push({ data: { id: (i + 1).toString() } });
    }

    const edges = [];
    // Ensure a path by connecting nodes linearly
    for (let i = 1; i < nodes.length; i++) {
        edges.push({
            data: {
                source: i.toString(),
                target: (i + 1).toString(),
                weight: Math.floor(Math.random() * (config.maxWeight - config.minWeight + 1)) + config.minWeight
            }
        });
    }

    edges.forEach((edge, index) => {
        edge.data.alt = index % 2 === 0 ? 'left' : 'right';
    });

    // Add random edges until we reach required count
    while (edges.length < config.edges) {
        const source = (Math.floor(Math.random() * nodes.length) + 1).toString();
        const target = (Math.floor(Math.random() * nodes.length) + 1).toString();
        if (source !== target && !edges.some(e => (e.data.source === source && e.data.target === target) || (e.data.source === target && e.data.target === source))) {
            edges.push({
                data: {
                    source,
                    target,
                    weight: Math.floor(Math.random() * (config.maxWeight - config.minWeight + 1)) + config.minWeight
                }
            });
        }
    }

    return { nodes, edges };
}

export function buildAdjacencyMatrix(nodes, edges) {
    const adjacencyMatrix = Array(nodes.length).fill(null).map(() => Array(nodes.length).fill(0));
    edges.forEach(edge => {
        const sourceIndex = parseInt(edge.data.source) - 1;
        const targetIndex = parseInt(edge.data.target) - 1;
        const weight = edge.data.weight;
        adjacencyMatrix[sourceIndex][targetIndex] = weight;
        adjacencyMatrix[targetIndex][sourceIndex] = weight;
    });
    return adjacencyMatrix;
}
