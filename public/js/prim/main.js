import cytoscape from 'https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.20.0/cytoscape.esm.min.js';
import { primAllMSTs } from './prim-mst.js';
import { createGraph, buildAdjacencyMatrix } from '../common/graph-utils.js';
import { updateActionTable, hasOtherConnectedBlueEdges } from './ui-utils.js';
import { isEdgeInTable, isNodeInTable, logAdjacencyMatrix, normalizeEdges, hideSubmitLineOnClick } from '../common/common.js';
import '../common/timer.js';
import { totalSeconds, stopTimer } from '../common/timer.js'; // Import totalSeconds
import '../common/edgeWeights.js';
import { addEdgeWeight, subtractEdgeWeight } from '../common/edgeWeights.js';
import { updatePlayerScore } from '../common/scoreUpdater.js';


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
                {
                    selector: 'node',
                    style: {
                        'background-color': '#e9ecef',
                        'background-image': 'url(../img/house.png)',
                        'background-fit': 'cover',
                        'background-opacity': 1,
                        'label': 'data(id)',
                        'text-valign': 'center',
                        'text-halign': 'center',
                        'color': '#000000',
                        'text-outline-color': '#ffffff',
                        'text-outline-width': 1,
                        'width': '40px',
                        'height': '40px',
                        'font-size': '8px'
                    }
                },
                {
                    selector: `node[id="${startingNodeId}"]`,
                    style: {
                        'background-color': '#e9ecef',
                        'background-image': 'url(../img/house_starting_node.png)',
                        'background-fit': 'cover',
                        'background-opacity': 1,
                        'width': '50px',
                        'height': '50px'
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'width': 1,
                        'line-color': '#999',
                        'label': 'data(weight)',
                        'text-margin-y': -5,
                        'color': '#000000',
                        'font-size': '6px',
                        'text-wrap': 'wrap',
                        'text-rotation': 'none',
                        'overlay-padding': '10px' // Larger clickable area
                    }
                },
                {
                    selector: 'edge[data(alt) = "left"]', // Custom attribute for left shift
                    style: {
                        'text-margin-x': -8 // Shift left
                    }
                },
                {
                    selector: 'edge[data(alt) = "right"]', // Custom attribute for right shift
                    style: {
                        'text-margin-x': 8 // Shift right
                    }
                }
            ],
            layout: {
                name: 'cose',
                padding: 10
            },
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
        const existingActionIndex = actionHistory.findIndex(action => action.edge.id() === edge.id());

        if (existingActionIndex !== -1) {
            // If the edge is already in history, undo it
            handleUndoAction(cy, actionHistory, startingNodeId, actionTableId);
            return;
        }

        edge.style({ 'width': 4, 'line-color': '#94d95f' });
        const sourceNode = cy.$(`#${edge.data('source')}`);
        const targetNode = cy.$(`#${edge.data('target')}`);

        setNodeStyle(sourceNode, startingNodeId, '#459e09', '#94d95f');
        setNodeStyle(targetNode, startingNodeId, '#459e09', '#94d95f');

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
                    node.style('background-color', '#e9ecef');
                } else {
                    node.style('background-color', '#459e09');
                }
            } else {
                node.style('background-color', '#e9ecef');
            }
        }
    }

    // Function to handle submit action
    function handleSubmitAction(cy, actionHistory, allMSTs, ids) {
        // Map player's solution from action history
        const playerSolution = actionHistory.map(({ edge }) => ({
            Vertex1: parseInt(edge.data('source')),
            Vertex2: parseInt(edge.data('target')),
            Weight: parseInt(edge.data('weight'))
        }));

        // Normalize player's solution for comparison
        const normalizedPlayerSolution = normalizeEdges(playerSolution);

        // Check if the player's solution matches any of the correct MSTs
        const isCorrect = allMSTs.some(mst => {
            const normalizedMST = normalizeEdges(
                mst.map(([u, v, w]) => ({ Vertex1: u + 1, Vertex2: v + 1, Weight: w }))
            );
            return JSON.stringify(normalizedPlayerSolution) === JSON.stringify(normalizedMST);
        });

        // Hide the submit button's line on click
        hideSubmitLineOnClick('#submit-line-en, #submit-line-el');

        // Retrieve the language setting
        const lang = localStorage.getItem('language') || 'el';

        // Calculate score based on total vertices, edges, and time taken
        const totalVertices = cy.nodes().length;
        const totalEdges = cy.edges().length;
        console.log("Total Vertices: " + totalVertices, "Total Edges: " + totalEdges);
        console.log('Total Time in Seconds:', totalSeconds);
        let score = Math.floor((totalVertices * totalEdges * 100) / totalSeconds);
        console.log(score);

        // Prepare popup message
        const popupMessage = $('#' + ids.popupMessageId);
        popupMessage.empty(); // Clear existing content

        // Define messages for each language
        const messages = {
            en: {
                correct: "Congratulations!",
                correct2: "Your answer was correct!",
                incorrect: "Your answer is not correct...",
                incorrect2: "Try again or visit the tutorial...",
                score: "Your Score is:"
            },
            el: {
                correct: "Συγχαρητήρια!",
                correct2: "Η απάντησή σας ήταν σωστή!",
                incorrect: "Η απάντησή σας δεν είναι σωστή...",
                incorrect2: "Προσπαθήστε ξανά ή επισκεφθείτε τον οδηγό...",
                score: "Το Σκορ σας είναι:"
            }
        };

        // Update the popup message based on correctness
        popupMessage.append(`
        <p>${isCorrect ? messages[lang].correct : messages[lang].incorrect}</p>
        <p>${isCorrect ? messages[lang].correct2 : messages[lang].incorrect2}</p>
    `);

        // Adjust the score if the answer is incorrect
        if (!isCorrect) {
            score = 0;
        }

        popupMessage.append(`<p>${messages[lang].score} ${score}</p>`);
        $('#' + ids.popupId).removeClass('hidden');

        // Stop the timer
        stopTimer();

        // If score is positive, update the player's score in the database
        if (score > 0) {
            const username = sessionStorage.getItem('username');
            console.log(`Retrieved username from sessionStorage: ${username}`);
            if (!username) {
                console.error('Username is null or undefined in sessionStorage');
                return;
            }
            const method = $('#gameMethod').val();
            console.log(`Username: ${username}, Method: ${method}`);
            updatePlayerScore(username, score, method)
                .then((result) => {
                    console.log('Score added successfully!', result);
                })
                .catch((err) => {
                    console.error('Error adding score:', err);
                });
        }
    }

    // stop time on back button from browser
    window.addEventListener('beforeunload', function() {
        stopTimer();
    });

});
