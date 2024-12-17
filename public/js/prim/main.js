import cytoscape from 'https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.20.0/cytoscape.esm.min.js';
import { primAllMSTs } from './prim-mst.js';
import { createGraph, buildAdjacencyMatrix } from '../common/graph-utils.js';
import { updateActionTable, hasOtherConnectedBlueEdges } from './ui-utils.js';
import { isEdgeInTable, isNodeInTable, logAdjacencyMatrix, normalizeEdges } from '../common/common.js';
import '../common/timer.js';
import { totalSeconds, stopTimer } from '../common/timer.js'; // Import totalSeconds
import '../common/edgeWeights.js';
import { addEdgeWeight, subtractEdgeWeight } from '../common/edgeWeights.js';



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
            submitButtonId: 'submit-button' + suffix,
            popupId: 'popup' + suffix,
            popupMessageId: 'popup-message' + suffix,
            popupCloseId: 'popup-close' + suffix
        };

        const { nodes, edges } = createGraph(level, vertices, edgesCount, minWeight, maxWeight);
        const startingNodeId = setStartingNode(nodes);

        logGraphDetails(edges, startingNodeId);

        const adjacencyMatrix = buildAdjacencyMatrix(nodes, edges);
        logAdjacencyMatrix(adjacencyMatrix);

        const allMSTs = primAllMSTs(adjacencyMatrix, startingNodeId);
        exportDataForDownload(edges, startingNodeId);

        const cy = initializeCytoscape(nodes, edges, startingNodeId);

        setupEventListeners(cy, allMSTs, ids, startingNodeId);
    }

    // Function to set starting node randomly
    function setStartingNode(nodes) {
        const startingNodeIndex = Math.floor(Math.random() * nodes.length);
        return nodes[startingNodeIndex].data.id;
    }

    // Function to log graph details
    function logGraphDetails(edges, startingNodeId) {
        const edgeTable = edges.map(edge => ({
            Vertex1: edge.data.source,
            Vertex2: edge.data.target,
            Weight: edge.data.weight
        }));
        console.log("Vertices and Edges with Weights:");
        console.table(edgeTable);
        console.log("Starting Vertex:", startingNodeId);
    }

    // Function to export data for download
    function exportDataForDownload(edgeTable, startingNodeId) {
        window.exportData = { table: edgeTable, startingVertex: startingNodeId };
    }

    // Function to initialize Cytoscape
    function initializeCytoscape(nodes, edges, startingNodeId) {
        return cytoscape({
            container: document.getElementById('cy'),
            elements: { nodes, edges },
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
    }

    // Function to set up event listeners
    function setupEventListeners(cy, allMSTs, ids, startingNodeId) {
        cy.on('tap', 'edge', function(evt) {
            handleEdgeSelection(evt, cy, actionHistory, startingNodeId, ids.actionTableId);
        });

        $('#' + ids.undoButtonId).click(function() {
            handleUndoAction(cy, actionHistory, startingNodeId, ids.actionTableId);
        });

        $('#' + ids.submitButtonId).click(function() {
            handleSubmitAction(cy, actionHistory, allMSTs, ids);
        });
        $('#quit-button').click(function() {
            stopTimer();
            window.location.href = '/play-prim';
        });

    }

    // Function to handle edge selection
    function handleEdgeSelection(evt, cy, actionHistory, startingNodeId, actionTableId) {
        const edge = evt.target;
        if (isEdgeInTable(actionHistory, edge.id())) return;

        edge.style({ 'width': 4, 'line-color': '#0000FF' });
        const sourceNode = cy.$(`#${edge.data('source')}`);
        const targetNode = cy.$(`#${edge.data('target')}`);

        setNodeStyle(sourceNode, startingNodeId, '#FF00FF', '#0000FF');
        setNodeStyle(targetNode, startingNodeId, '#FF00FF', '#0000FF');

        actionHistory.push({ edge, sourceNode, targetNode });
        updateActionTable(actionHistory, actionTableId);

        // Add the weight of the selected edge
        const edgeWeight = parseInt(edge.data('weight'));
        addEdgeWeight(edgeWeight);
    }

    // Function to set node style
    function setNodeStyle(node, startingNodeId, startingNodeColor, otherNodeColor) {
        if (node.id() === startingNodeId) {
            node.style('background-color', startingNodeColor);
        } else {
            node.style('background-color', otherNodeColor);
        }
    }

    // Function to handle undo action
    function handleUndoAction(cy, actionHistory, startingNodeId, actionTableId) {
        if (actionHistory.length > 0) {
            const { edge, sourceNode, targetNode } = actionHistory.pop();
            edge.style({ 'width': 1, 'line-color': '#999' });

            resetNodeStyle(sourceNode, startingNodeId, cy);
            resetNodeStyle(targetNode, startingNodeId, cy);

            updateActionTable(actionHistory, actionTableId);

            // Subtract the weight of the undone edge
            const edgeWeight = parseInt(edge.data('weight'));
            subtractEdgeWeight(edgeWeight);
        }
    }

    // Function to reset node style
    function resetNodeStyle(node, startingNodeId, cy) {
        if (!isNodeInTable(actionHistory, node.id())) {
            if (node.id() === startingNodeId) {
                if (!hasOtherConnectedBlueEdges(node, cy)) {
                    node.style('background-color', '#FF0000');
                } else {
                    node.style('background-color', '#FF00FF');
                }
            } else {
                node.style('background-color', '#69b3a2');
            }
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

        const totalVertices = cy.nodes().length;
        const totalEdges = cy.edges().length;
        console.log("Total Vertices: " + totalVertices, "Total Edges: " + totalEdges);
        console.log('Total Time in Seconds:', totalSeconds);
        let score = Math.floor((totalVertices * totalEdges * 100) / totalSeconds);
        console.log(score);

        const popupMessage = $('#' + ids.popupMessageId);
        popupMessage.text(isCorrect ? "Right!" : "Wrong!");

        if (popupMessage.text() === "Wrong!") {
            score = 0;
        }

        popupMessage.append(`<br>Your Score is : ${score}`);
        $('#' + ids.popupId).removeClass('hidden');

        // Stop the timer
        stopTimer();
    }

    // Add this at the end of your main.js file

    window.addEventListener('beforeunload', function() {
        stopTimer();
    });

});
