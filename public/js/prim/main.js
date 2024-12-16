// main.js
import cytoscape from 'https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.20.0/cytoscape.esm.min.js';
import { primAllMSTs } from './prim-mst.js';
import { createGraph, buildAdjacencyMatrix } from '../common/graph-utils.js';
import { updateActionTable, hasOtherConnectedBlueEdges } from './ui-utils.js';
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
        // Determine current language
        const currentLanguage = localStorage.getItem('language') || 'el';
        const suffix = currentLanguage === 'en' ? '-en' : '-el';

        const undoButtonId = 'undo-button' + suffix;
        const actionTableId = 'action-table' + suffix;
        const submitButtonId = 'submit-button' + suffix;
        const popupId = 'popup' + suffix;
        const popupMessageId = 'popup-message' + suffix;
        const popupCloseId = 'popup-close' + suffix;

        const { nodes, edges } = createGraph(level, vertices, edgesCount, minWeight, maxWeight);

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

        // Create adjacency matrix
        const adjacencyMatrix = buildAdjacencyMatrix(nodes, edges);
        console.log("Adjacency Matrix:");
        adjacencyMatrix.forEach(row => console.log(row.join(' ')));

        // Compute all MSTs
        const allMSTs = primAllMSTs(adjacencyMatrix, startingNodeId);

        function exportData(table, startingVertex) {
            return { table, startingVertex };
        }

        window.exportData = exportData(edgeTable, startingNodeId);

        const cy = cytoscape({
            container: document.getElementById('cy'),
            elements: { nodes: nodes, edges: edges },
            style: [
                { selector: 'node', style: { 'background-color': '#69b3a2', 'label': 'data(id)', 'text-valign': 'center', 'text-halign': 'center', 'color': '#ffffff', 'width': '15px', 'height': '15px', 'font-size': '8px' } },
                { selector: 'node[id="' + startingNodeId + '"]', style: { 'background-color': '#FF0000' } },
                { selector: 'edge', style: { 'width': 1, 'line-color': '#999', 'label': 'data(weight)', 'text-margin-y': -5, 'color': '#000000', 'font-size': '4px', 'text-wrap': 'wrap', 'text-rotation': 'none' } },
                { selector: 'edge:selected', style: { 'width': 4, 'line-color': '#0000FF' } },
                { selector: 'node:selected', style: { 'background-color': '#0000FF' } }
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
                return; // Skip if edge is already chosen
            }

            edge.style({ 'width': 4, 'line-color': '#0000FF' });
            const sourceNode = cy.$(`#${edge.data('source')}`);
            const targetNode = cy.$(`#${edge.data('target')}`);

            if (sourceNode.id() === startingNodeId) {
                sourceNode.style('background-color', '#FF00FF');
            } else {
                sourceNode.style('background-color', '#0000FF');
            }

            if (targetNode.id() === startingNodeId) {
                targetNode.style('background-color', '#FF00FF');
            } else {
                targetNode.style('background-color', '#0000FF');
            }

            actionHistory.push({ edge, sourceNode, targetNode });
            updateActionTable(actionHistory, actionTableId);
        });

        document.getElementById(undoButtonId).addEventListener('click', function() {
            if (actionHistory.length > 0) {
                const { edge, sourceNode, targetNode } = actionHistory.pop();
                edge.style({ 'width': 1, 'line-color': '#999' }); // revert style

                if (!isNodeInTable(actionHistory, sourceNode.id())) {
                    if (sourceNode.id() === startingNodeId) {
                        if (!hasOtherConnectedBlueEdges(sourceNode, cy)) {
                            sourceNode.style('background-color', '#FF0000');
                        } else {
                            sourceNode.style('background-color', '#FF00FF');
                        }
                    } else {
                        sourceNode.style('background-color', '#69b3a2');
                    }
                }

                if (!isNodeInTable(actionHistory, targetNode.id())) {
                    if (targetNode.id() === startingNodeId) {
                        if (!hasOtherConnectedBlueEdges(targetNode, cy)) {
                            targetNode.style('background-color', '#FF0000');
                        } else {
                            targetNode.style('background-color', '#FF00FF');
                        }
                    } else {
                        targetNode.style('background-color', '#69b3a2');
                    }
                }

                updateActionTable(actionHistory, actionTableId);
            }
        });

        document.getElementById(submitButtonId).addEventListener('click', function () {
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

            const popup = document.getElementById(popupId);
            const popupMessage = document.getElementById(popupMessageId);
            popupMessage.textContent = isCorrect ? "Right!" : "Wrong!";
            popup.classList.remove('hidden');
        });

        document.getElementById(popupCloseId).addEventListener('click', function () {
            const popup = document.getElementById(popupId);
            popup.classList.add('hidden');
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
