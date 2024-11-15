document.addEventListener("DOMContentLoaded", function() {
    const urlParams = new URLSearchParams(window.location.search);
    const level = urlParams.get('level') || 'beginner';
    const vertices = parseInt(urlParams.get('vertices')) || 5;
    const edgesCount = parseInt(urlParams.get('edges')) || 7;
    const minWeight = parseInt(urlParams.get('minWeight')) || 1;
    const maxWeight = parseInt(urlParams.get('maxWeight')) || 16;

    function createGraph(level) {
        const levelConfig = {
            beginner: { vertices: 5, edges: 7, minWeight: 1, maxWeight: 16 },
            intermediate: { vertices: 7, edges: 10, minWeight: 1, maxWeight: 16 },
            expert: { vertices: 10, edges: 15, minWeight: 1, maxWeight: 16 },
            custom: { vertices: vertices, edges: edgesCount, minWeight: minWeight, maxWeight: maxWeight }
        };

        const config = levelConfig[level] || levelConfig.beginner;

        const nodes = [];
        for (let i = 0; i < config.vertices; i++) {
            nodes.push({ data: { id: (i + 1).toString() } });
        }

        const edges = [];
        for (let i = 1; i < nodes.length; i++) {
            edges.push({ data: { source: (i).toString(), target: (i + 1).toString(), weight: Math.floor(Math.random() * (config.maxWeight - config.minWeight + 1)) + config.minWeight } });
        }

        while (edges.length < config.edges) {
            const source = (Math.floor(Math.random() * nodes.length) + 1).toString();
            const target = (Math.floor(Math.random() * nodes.length) + 1).toString();
            if (source !== target && !edges.some(edge => (edge.data.source === source && edge.data.target === target) || (edge.data.source === target && edge.data.target === source))) {
                edges.push({ data: { source, target, weight: Math.floor(Math.random() * (config.maxWeight - config.minWeight + 1)) + config.minWeight } });
            }
        }

        return { nodes, edges };
    }

    function initGame(level) {
        const { nodes, edges } = createGraph(level);

        const edgeTable = edges.map(edge => ({
            Vertex1: edge.data.source,
            Vertex2: edge.data.target,
            Weight: edge.data.weight
        }));
        console.log("Vertices and Edges with Weights:");
        console.table(edgeTable);

        function exportData(table) {
            return { table };
        }

        window.exportData = exportData(edgeTable);

        const cy = cytoscape({
            container: document.getElementById('cy'),
            elements: { nodes: nodes, edges: edges },
            style: [
                { selector: 'node', style: { 'background-color': '#69b3a2', 'label': 'data(id)', 'text-valign': 'center', 'text-halign': 'center', 'color': '#ffffff', 'width': '15px', 'height': '15px', 'font-size': '8px' } },
                { selector: 'edge', style: { 'width': 1, 'line-color': '#999', 'label': 'data(weight)', 'text-margin-y': -5, 'color': '#000000', 'font-size': '4px', 'text-wrap': 'wrap', 'text-rotation': 'none' } }
            ],
            layout: { name: 'cose', padding: 10 },
            userZoomingEnabled: false
        });

        cy.ready(function() {
            cy.elements('edge').forEach(function(edge) {
                const label = edge.data('weight');
                edge.data('label', label);
            });

            cy.elements('edge').move({ parent: null });
        });
    }

    initGame(level);
});
