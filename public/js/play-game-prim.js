document.addEventListener("DOMContentLoaded", function() {
    const urlParams = new URLSearchParams(window.location.search);
    const level = urlParams.get('level') || 'beginner';
    const vertices = parseInt(urlParams.get('vertices')) || 5;
    const edgesCount = parseInt(urlParams.get('edges')) || 7;
    const minWeight = parseInt(urlParams.get('minWeight')) || 1;
    const maxWeight = parseInt(urlParams.get('maxWeight')) || 16;

    let actionHistory = [];

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

        const startingNodeIndex = Math.floor(Math.random() * nodes.length);
        const startingNodeId = nodes[startingNodeIndex].data.id;

        const edgeTable = edges.map(edge => ({
            Vertex1: edge.data.source,
            Vertex2: edge.data.target,
            Weight: edge.data.weight
        }));
        console.log("Vertices and Edges with Weights:");
        console.table(edgeTable);
        console.log("Starting Vertex:", startingNodeId);

        function exportData(table, startingVertex) {
            return { table, startingVertex };
        }

        window.exportData = exportData(edgeTable, startingNodeId);

        const cy = cytoscape({
            container: document.getElementById('cy'),
            elements: { nodes: nodes, edges: edges },
            style: [
                { selector: 'node', style: { 'background-color': '#69b3a2', 'label': 'data(id)', 'text-valign': 'center', 'text-halign': 'center', 'color': '#ffffff', 'width': '15px', 'height': '15px', 'font-size': '8px' } },
                { selector: 'node[id="' + startingNodeId + '"]', style: { 'background-color': '#FF0000' } }, // Starting node is red
                { selector: 'edge', style: { 'width': 1, 'line-color': '#999', 'label': 'data(weight)', 'text-margin-y': -5, 'color': '#000000', 'font-size': '4px', 'text-wrap': 'wrap', 'text-rotation': 'none' } },
                { selector: 'edge.selected', style: { 'width': 4, 'line-color': '#0000FF' } }, // Selected edge is thick and blue
                { selector: 'node.selected', style: { 'background-color': '#0000FF' } } // Nodes connected by selected edge turn blue
            ],
            layout: { name: 'cose', padding: 10 },
            userZoomingEnabled: false,
            userPanningEnabled: false,
            boxSelectionEnabled: false,
            autoungrabify: true
        });

        cy.on('tap', 'edge', function(evt) {
            const edge = evt.target;
            edge.style({ 'width': 4, 'line-color': '#0000FF' }); // Ensure the edge stays thick and blue
            const sourceNode = cy.$(`#${edge.data('source')}`);
            const targetNode = cy.$(`#${edge.data('target')}`);

            if (sourceNode.id() === startingNodeId) {
                sourceNode.style('background-color', '#FF00FF'); // Fuchsia
            } else {
                sourceNode.style('background-color', '#0000FF'); // Blue
            }

            if (targetNode.id() === startingNodeId) {
                targetNode.style('background-color', '#FF00FF'); // Fuchsia
            } else {
                targetNode.style('background-color', '#0000FF'); // Blue
            }

            actionHistory.push({ edge, sourceNode, targetNode }); // Store clicked edge and connected nodes
        });

        document.getElementById('undo-button').addEventListener('click', function() {
            if (actionHistory.length > 0) {
                const { edge, sourceNode, targetNode } = actionHistory.pop();
                edge.style({ 'width': 1, 'line-color': '#999' }); // Revert edge style

                if (sourceNode.id() === startingNodeId) {
                    const remainingEdges = cy.$(`#${startingNodeId}`).connectedEdges().filter(e => e.style('line-color') === 'rgb(0, 0, 255)');
                    if (remainingEdges.length === 0) {
                        sourceNode.style('background-color', '#FF0000'); // Revert starting node to red if no other connected blue edges
                    } else {
                        sourceNode.style('background-color', '#FF00FF'); // Keep fuchsia if still connected
                    }
                } else {
                    sourceNode.style('background-color', '#69b3a2'); // Revert to original color
                }

                if (targetNode.id() === startingNodeId) {
                    const remainingEdges = cy.$(`#${startingNodeId}`).connectedEdges().filter(e => e.style('line-color') === 'rgb(0, 0, 255)');
                    if (remainingEdges.length === 0) {
                        targetNode.style('background-color', '#FF0000'); // Revert starting node to red if no other connected blue edges
                    } else {
                        targetNode.style('background-color', '#FF00FF'); // Keep fuchsia if still connected
                    }
                } else {
                    targetNode.style('background-color', '#69b3a2'); // Revert to original color
                }
            }
        });


        function hasOtherConnectedBlueEdges(node, cy, currentEdge) {
            const connectedEdges = node.connectedEdges().filter(e => e !== currentEdge);
            return connectedEdges.some(edge => edge.style('line-color') === 'rgb(0, 0, 255)'); // Check if any other connected edges are blue
        }



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
