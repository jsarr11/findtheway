// main-kruskal.js
import cytoscape from 'https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.20.0/cytoscape.esm.min.js';
import { kruskalAllMSTs } from './kruskal-mst.js';
import { createGraph, buildAdjacencyMatrix } from '../common/graph-utils.js';
import { updateActionTable } from './ui-utils.js';
import { isEdgeInTable, isNodeInTable } from '../common/common.js';

document.addEventListener("DOMContentLoaded", function() {
    const urlParams = new URLSearchParams(window.location.search);
    const level = urlParams.get('level') || 'beginner';
    const vertices = parseInt(urlParams.get('vertices')) || 5;
    const edgesCount = parseInt(urlParams.get('edges')) || 7;
    const minWeight = parseInt(urlParams.get('minWeight')) || 1;
    const maxWeight = parseInt(urlParams.get('maxWeight')) || 16;

    let actionHistory = [];

    function initGame(level) {
        // Determine current language from localStorage
        const currentLanguage = localStorage.getItem('language') || 'el';
        const suffix = currentLanguage === 'en' ? '-en' : '-el';

        const undoButtonId = 'undo-button' + suffix;
        const actionTableId = 'action-table' + suffix;
        const submitButtonId = 'submit-button-kruskal' + suffix;
        const popupId = 'popup' + suffix;
        const popupMessageId = 'popup-message' + suffix;
        const popupCloseId = 'popup-close' + suffix;

        const { nodes, edges } = createGraph(level, vertices, edgesCount, minWeight, maxWeight);

        const edgeTable = edges.map(edge => ({
            Vertex1: edge.data.source,
            Vertex2: edge.data.target,
            Weight: edge.data.weight
        }));
        console.log("Vertices and Edges with Weights:");
        console.table(edgeTable);

        const adjacencyMatrix = buildAdjacencyMatrix(nodes, edges);
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

        cy.on('tap', 'edge', function(evt) {
            const edge = evt.target;

            if (isEdgeInTable(actionHistory, edge.id())) {
                return;
            }

            edge.style({ 'width': 4, 'line-color': '#0000FF' });
            const sourceNode = cy.$(`#${edge.data('source')}`);
            const targetNode = cy.$(`#${edge.data('target')}`);

            sourceNode.style('background-color', '#0000FF');
            targetNode.style('background-color', '#0000FF');

            actionHistory.push({ edge, sourceNode, targetNode });
            updateActionTable(actionHistory, actionTableId); // Pass the correct table ID
        });

        document.getElementById(undoButtonId).addEventListener('click', function() {
            if (actionHistory.length > 0) {
                const { edge, sourceNode, targetNode } = actionHistory.pop();
                edge.style({ 'width': 1, 'line-color': '#999' });

                if (!isNodeInTable(actionHistory, sourceNode.id())) {
                    sourceNode.style('background-color', '#69b3a2');
                }

                if (!isNodeInTable(actionHistory, targetNode.id())) {
                    targetNode.style('background-color', '#69b3a2');
                }

                updateActionTable(actionHistory, actionTableId);
            }
        });

        document.getElementById(submitButtonId).addEventListener('click', function() {
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

            document.getElementById(popupMessageId).innerText = isCorrect ? 'Correct!' : 'Incorrect, try again.';
            document.getElementById(popupId).classList.remove('hidden');
        });

        document.getElementById(popupCloseId).addEventListener('click', function() {
            document.getElementById(popupId).classList.add('hidden');
        });
    }

    initGame(level);
});
