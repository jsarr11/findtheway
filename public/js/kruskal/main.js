import cytoscape from 'https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.20.0/cytoscape.esm.min.js';
import { kruskalAllMSTs } from './kruskal-mst.js';
import { createGraph, buildAdjacencyMatrix } from '../common/graph-utils.js';
import { updateActionTable } from './ui-utils.js';
import { isEdgeInTable, isNodeInTable, logAdjacencyMatrix, normalizeEdges } from '../common/common.js';

$(document).ready(function() {
    const urlParams = new URLSearchParams(window.location.search);
    const level = urlParams.get('level') || 'beginner';
    const vertices = parseInt(urlParams.get('vertices')) || 5;
    const edgesCount = parseInt(urlParams.get('edges')) || 7;
    const minWeight = parseInt(urlParams.get('minWeight')) || 1;
    const maxWeight = parseInt(urlParams.get('maxWeight')) || 16;

    let actionHistory = [];

    // Initialize the game
    initGame(level, vertices, edgesCount, minWeight, maxWeight);

    // Function to initialize the game
    function initGame(level, vertices, edgesCount, minWeight, maxWeight) {
        const currentLanguage = localStorage.getItem('language') || 'el';
        const suffix = currentLanguage === 'en' ? '-en' : '-el';

        const ids = {
            undoButtonId: 'undo-button' + suffix,
            actionTableId: 'action-table' + suffix,
            submitButtonId: 'submit-button-kruskal' + suffix,
            popupId: 'popup' + suffix,
            popupMessageId: 'popup-message' + suffix,
            popupCloseId: 'popup-close' + suffix
        };

        const { nodes, edges } = createGraph(level, vertices, edgesCount, minWeight, maxWeight);

        logGraphDetails(edges);

        const adjacencyMatrix = buildAdjacencyMatrix(nodes, edges);
        logAdjacencyMatrix(adjacencyMatrix);

        const allMSTs = kruskalAllMSTs(adjacencyMatrix);
        exportDataForDownload(edges);

        const cy = initializeCytoscape(nodes, edges);

        setupEventListeners(cy, allMSTs, ids);
    }

    // Function to log graph details
    function logGraphDetails(edges) {
        const edgeTable = edges.map(edge => ({
            Vertex1: edge.data.source,
            Vertex2: edge.data.target,
            Weight: edge.data.weight
        }));
        console.log("Vertices and Edges with Weights:");
        console.table(edgeTable);
    }

    // Function to export data for download
    function exportDataForDownload(edgeTable) {
        window.exportData = { table: edgeTable };
    }

    // Function to initialize Cytoscape
    function initializeCytoscape(nodes, edges) {
        return cytoscape({
            container: document.getElementById('cy'),
            elements: { nodes, edges },
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
    }

    // Function to set up event listeners
    function setupEventListeners(cy, allMSTs, ids) {
        cy.on('tap', 'edge', function(evt) {
            handleEdgeSelection(evt, cy, actionHistory, ids.actionTableId);
        });

        $('#' + ids.undoButtonId).click(function() {
            handleUndoAction(cy, actionHistory, ids.actionTableId);
        });

        $('#' + ids.submitButtonId).click(function() {
            handleSubmitAction(cy, actionHistory, allMSTs, ids);
        });
    }

    // Function to handle edge selection
    function handleEdgeSelection(evt, cy, actionHistory, actionTableId) {
        const edge = evt.target;
        if (isEdgeInTable(actionHistory, edge.id())) return;

        edge.style({ 'width': 4, 'line-color': '#0000FF' });
        const sourceNode = cy.$(`#${edge.data('source')}`);
        const targetNode = cy.$(`#${edge.data('target')}`);

        sourceNode.style('background-color', '#0000FF');
        targetNode.style('background-color', '#0000FF');

        actionHistory.push({ edge, sourceNode, targetNode });
        updateActionTable(actionHistory, actionTableId);
    }

    // Function to handle undo action
    function handleUndoAction(cy, actionHistory, actionTableId) {
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
    }

    // Function to handle submit action
    function handleSubmitAction(cy, actionHistory, allMSTs, ids) {
        const playerSolution = actionHistory.map(({ edge }) => ({
            Vertex1: parseInt(edge.data('source')),
            Vertex2: parseInt(edge.data('target')),
            Weight: parseInt(edge.data('weight'))
        }));

        const normalizedPlayerSolution = normalizeEdges(playerSolution);

        const isCorrect = allMSTs.some(mst => {
            const normalizedMST = normalizeEdges(
                mst.map(([u, v, w]) => ({ Vertex1: u + 1, Vertex2: v + 1, Weight: w }))
            );
            return JSON.stringify(normalizedPlayerSolution) === JSON.stringify(normalizedMST);
        });

        const popupMessage = $('#' + ids.popupMessageId);
        popupMessage.text(isCorrect ? "Correct!" : "Incorrect, try again.");
        $('#' + ids.popupId).removeClass('hidden');
    }
});
