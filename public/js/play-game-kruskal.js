import cytoscape from 'https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.20.0/cytoscape.esm.min.js';
import { kruskalAllMSTs } from './kruskal-mst.js';

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

        const edgeTable = edges.map(edge => ({
            Vertex1: edge.data.source,
            Vertex2: edge.data.target,
            Weight: edge.data.weight
        }));
        console.log("Vertices and Edges with Weights:");
        console.table(edgeTable);

        const adjacencyMatrix = Array(nodes.length).fill(null).map(() => Array(nodes.length).fill(0));

        edges.forEach(edge => {
            const sourceIndex = parseInt(edge.data.source) - 1;
            const targetIndex = parseInt(edge.data.target) - 1;
            const weight = edge.data.weight;
            adjacencyMatrix[sourceIndex][targetIndex] = weight;
            adjacencyMatrix[targetIndex][sourceIndex] = weight;
        });

        console.log("Adjacency Matrix:");
        adjacencyMatrix.forEach(row => console.log(row.join(' ')));

        const allMSTs = kruskalAllMSTs(adjacencyMatrix);

        function exportData(table) {
            return { table };
        }

        window.exportData = exportData(edgeTable);

        const cy = cytoscape({
            container: document.getElementById('cy'),
            elements: { nodes: nodes, edges: edges },
            style: [
                { selector: 'node', style: { 'background-color': '#69b3a2', 'label': 'data(id)', 'text-valign': 'center', 'text-halign': 'center', 'color': '#ffffff', 'width': '15px', 'height': '15px', 'font-size': '8px' } },
                { selector: 'edge', style: { 'width': 1, 'line-color': '#999', 'label': 'data(weight)', 'text-margin-y': -5, 'color': '#000000', 'font-size': '4px', 'text-wrap': 'wrap', 'text-rotation': 'none' } },
                { selector: 'edge:selected', style: { 'width': 4, 'line-color': '#0000FF' } }
            ],
            layout: { name: 'cose', padding: 10 },
            userZoomingEnabled: false,
            userPanningEnabled: false,
            boxSelectionEnabled: false,
            autoungrabify: true
        });

        function updateActionTable() {
            const actionTable = document.getElementById('action-table');
            actionTable.innerHTML = '<tr><th>Vertices</th><th>Weight</th></tr>';
            actionHistory.forEach(({ edge }) => {
                const row = document.createElement('tr');
                row.innerHTML = `<td>${edge.data('source')}-${edge.data('target')}</td><td>${edge.data('weight')}</td>`;
                actionTable.appendChild(row);
            });
        }

        function isEdgeInTable(edgeId) {
            return actionHistory.some(({ edge }) => edge.id() === edgeId);
        }

        function isNodeInTable(nodeId) {
            return actionHistory.some(({ sourceNode, targetNode }) => sourceNode.id() === nodeId || targetNode.id() === nodeId);
        }

        cy.on('tap', 'edge', function(evt) {
            const edge = evt.target;

            if (isEdgeInTable(edge.id())) {
                return;
            }

            edge.style({ 'width': 4, 'line-color': '#0000FF' });
            const sourceNode = cy.$(`#${edge.data('source')}`);
            const targetNode = cy.$(`#${edge.data('target')}`);

            sourceNode.style('background-color', '#0000FF');
            targetNode.style('background-color', '#0000FF');

            actionHistory.push({ edge, sourceNode, targetNode });
            updateActionTable();
        });

        document.getElementById('undo-button').addEventListener('click', function() {
            if (actionHistory.length > 0) {
                const { edge, sourceNode, targetNode } = actionHistory.pop();
                edge.style({ 'width': 1, 'line-color': '#999' });

                if (!isNodeInTable(sourceNode.id())) {
                    sourceNode.style('background-color', '#69b3a2');
                }

                if (!isNodeInTable(targetNode.id())) {
                    targetNode.style('background-color', '#69b3a2');
                }

                updateActionTable();
            }
        });

        document.getElementById('submit-button-kruskal').addEventListener('click', function() {
            const playerSolution = actionHistory.map(({ edge }) => ({
                Vertex1: parseInt(edge.data('source')),
                Vertex2: parseInt(edge.data('target')),
                Weight: parseInt(edge.data('weight'))
            }));

            const normalizeEdges = edges =>
                edges.map(edge =>
                    edge.Vertex1 < edge.Vertex2
                        ? edge
                        : { Vertex1: edge.Vertex2, Vertex2: edge.Vertex1, Weight: edge.Weight }
                ).sort((a, b) => a.Vertex1 - b.Vertex1 || a.Vertex2 - b.Vertex2);

            const normalizedPlayerSolution = normalizeEdges(playerSolution);

            const isCorrect = allMSTs.some(mst => {
                const normalizedMST = normalizeEdges(
                    mst.map(([u, v, w]) => ({ Vertex1: u + 1, Vertex2: v + 1, Weight: w }))
                );
                return JSON.stringify(normalizedPlayerSolution) === JSON.stringify(normalizedMST);
            });

            document.getElementById('popup-message').innerText = isCorrect ? 'Correct!' : 'Incorrect, try again.';
            document.getElementById('popup').classList.remove('hidden');
        });

        document.getElementById('popup-close').addEventListener('click', function() {
            document.getElementById('popup').classList.add('hidden');
        });
    }

    initGame(level);
});
