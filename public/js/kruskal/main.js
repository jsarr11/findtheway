import cytoscape from 'https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.20.0/cytoscape.esm.min.js';
import { kruskalAllMSTs } from './kruskal-mst.js';
import { createGraph, buildAdjacencyMatrix } from '../common/graph-utils.js';
import { updateActionTable } from './ui-utils.js';
import { hideSubmitLineOnClick, isEdgeInTable, isNodeInTable, logAdjacencyMatrix, normalizeEdges } from '../common/common.js';
import '../common/timer.js';
import { totalSeconds, stopTimer, startTimer, pauseTimer, resumeTimer, resetTimer } from '../common/timer.js';
import '../common/edgeWeights.js';
import { addEdgeWeight, subtractEdgeWeight, resetEdgeWeights } from '../common/edgeWeights.js';
import { updatePlayerScore } from '../common/scoreUpdater.js';

$(document).ready(function() {
    const urlParams = new URLSearchParams(window.location.search);
    const level = urlParams.get('level') || 'beginner';
    const vertices = parseInt(urlParams.get('vertices')) || 5;
    const edgesCount = parseInt(urlParams.get('edges')) || 7;
    const minWeight = parseInt(urlParams.get('minWeight')) || 1;
    const maxWeight = parseInt(urlParams.get('maxWeight')) || 16;

    // Store initial parameters
    sessionStorage.setItem('gameParams', JSON.stringify({
        level,
        vertices,
        edgesCount,
        minWeight,
        maxWeight
    }));

    let actionHistory = [];

    // Initialize the game
    initGame(level, vertices, edgesCount, minWeight, maxWeight);

    function initGame(level, vertices, edgesCount, minWeight, maxWeight, graphData = null) {
        const currentLanguage = localStorage.getItem('language') || 'el';
        const suffix = currentLanguage === 'en' ? '-en' : '-el';

        const ids = {
            undoButtonId: `undo-button${suffix}`,
            actionTableId: `action-table${suffix}`,
            submitButtonId: `submit-button-kruskal${suffix}`,
            popupId: `popup${suffix}`,
            popupMessageId: `popup-message${suffix}`,
            popupCloseId: `popup-close${suffix}`,
            pauseButtonId: `pause-button${suffix}`,
            pausePopupId: `pause-popup${suffix}`
        };


        let nodes, edges;
        if (graphData) {
            // Use the existing graph from sessionStorage
            nodes = graphData.nodes;
            edges = graphData.edges;
        } else {
            // Generate a new graph if none is saved
            const graphResult = createGraph(level, vertices, edgesCount, minWeight, maxWeight);
            nodes = graphResult.nodes;
            edges = graphResult.edges;
            sessionStorage.setItem('currentGraph', JSON.stringify({ nodes, edges }));
        }

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
        // Assign `alt` attribute dynamically for left/right alternation
        edges.forEach((edge, index) => {
            edge.data.alt = index % 2 === 0 ? 'left' : 'right';
        });

        return cytoscape({
            container: document.getElementById('cy'),
            elements: { nodes, edges },
            style: [
                {
                    selector: 'node',
                    style: {
                        'background-color': '#e9ecef',
                        'background-image': 'url(../img/house.png)', // Regular node image
                        'background-fit': 'cover',
                        'background-opacity': 1,
                        'label': 'data(id)',
                        'text-valign': 'center',
                        'text-halign': 'center',
                        'color': '#000000', // Set text color to black
                        'text-outline-color': '#ffffff', // White outline around text
                        'text-outline-width': 3, // Thickness of the white outline
                        'width': '40px', // Larger node size for image
                        'height': '40px',
                        'font-size': '12px'
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'width': 1,
                        'line-color': '#999',
                        'label': 'data(weight)',
                        // Conditionally shift text horizontally based on 'alt' attribute
                        'text-margin-y': -2,
                        'text-margin-x': 'data(alt, function(edge) { return edge.data.alt === "left" ? -6 : 6; })',
                        'color': '#000000',
                        'font-size': '6px',
                        'text-wrap': 'wrap',
                        'text-rotation': 'none',
                        'overlay-padding': '10px' // Larger clickable area
                    }
                },
                {
                    selector: 'edge:selected',
                    style: {
                        'width': 4,
                        'line-color': '#94d95f'
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
    function setupEventListeners(cy, allMSTs, ids) {
        // Edge selection event
        cy.off('tap', 'edge').on('tap', 'edge', function(evt) {
            handleEdgeSelection(evt, cy, actionHistory, ids.actionTableId);
        });

        // Undo button event
        $('#' + ids.undoButtonId).off('click').on('click', function() {
            handleUndoAction(cy, actionHistory, ids.actionTableId);
        });

        // Submit button event - FIXED
        $('#' + ids.submitButtonId).off('click').on('click', function() {
            console.log("Submit button clicked!"); // Debugging
            handleSubmitAction(cy, actionHistory, allMSTs, ids);
        });

        // Quit button event
        $('#quit-button').off('click').on('click', () => {
            stopTimer();
            window.location.href = '/play-kruskal';
        });

        // Pause button event
        $(`#${ids.pauseButtonId}`).off('click').on('click', () => {
            pauseTimer();
            $(`#${ids.pausePopupId}`).removeClass('hidden');
        });

        // Resume button event
        $(`#${ids.pausePopupId} .resume-button`).off('click').on('click', () => {
            resumeTimer();
            $(`#${ids.pausePopupId}`).addClass('hidden');
        });

        // Restart button event - FIXED
        $(`#${ids.pausePopupId} .restart-button`).off('click').on('click', () => {
            console.log("Restart button clicked"); // Debugging

            const savedGraph = sessionStorage.getItem('currentGraph');
            const params = JSON.parse(sessionStorage.getItem('gameParams'));

            if (params) {
                console.log("Restarting game with same graph..."); // Debugging

                if (typeof window.cy !== "undefined" && window.cy !== null) {
                    if (typeof window.cy.destroy === "function") {
                        console.log("Destroying Cytoscape instance...");
                        window.cy.destroy();
                    }
                }

                window.cy = null;  // Clear Cytoscape reference

                actionHistory = [];  // Reset action history
                $("#action-table-en").empty();
                $("#action-table-el").empty();
                resetEdgeWeights();  // Reset edge weights
                resetTimer();  // Fully reset the timer

                // Restart the timer properly after reset
                setTimeout(() => {
                    console.log("Calling startTimer() after resetTimer()");
                    startTimer();
                }, 100);

                // Reload the same graph if it exists, otherwise generate a new one
                window.cy = initGame(params.level, params.vertices, params.edgesCount,
                    params.minWeight, params.maxWeight, savedGraph ? JSON.parse(savedGraph) : null);

                $(`#${ids.pausePopupId}`).addClass('hidden');  // Hide pause popup
            }
        });

        // Quit button inside pause popup
        $(`#${ids.pausePopupId} .quit-button`).off('click').on('click', () => {
            stopTimer();
            window.location.href = '/play-kruskal';
        });

        // Stop timer when the user leaves the page
        window.addEventListener('beforeunload', function() {
            stopTimer();
        });
    }


    // Function to handle edge selection
    function handleEdgeSelection(evt, cy, actionHistory, actionTableId) {
        const edge = evt.target;
        const existingActionIndex = actionHistory.findIndex(action => action.edge.id() === edge.id());

        if (existingActionIndex !== -1) {
            // If the edge is already in history, undo it
            handleUndoAction(cy, actionHistory, actionTableId);
            return;
        }

        edge.style({ 'width': 4, 'line-color': '#94d95f' });
        const sourceNode = cy.$(`#${edge.data('source')}`);
        const targetNode = cy.$(`#${edge.data('target')}`);

        sourceNode.style('background-color', '#94d95f');
        targetNode.style('background-color', '#94d95f');

        actionHistory.push({ edge, sourceNode, targetNode });
        updateActionTable(actionHistory, actionTableId);

        // Add the weight of the selected edge
        const edgeWeight = parseInt(edge.data('weight'));
        addEdgeWeight(edgeWeight);
    }


    // Function to handle undo action
    function handleUndoAction(cy, actionHistory, actionTableId) {
        if (actionHistory.length > 0) {
            const { edge, sourceNode, targetNode } = actionHistory.pop();
            edge.style({ 'width': 1, 'line-color': '#999' });

            if (!isNodeInTable(actionHistory, sourceNode.id())) {
                sourceNode.style('background-color', '#e9ecef');
            }

            if (!isNodeInTable(actionHistory, targetNode.id())) {
                targetNode.style('background-color', '#e9ecef');
            }

            updateActionTable(actionHistory, actionTableId);

            // Subtract the weight of the undone edge
            const edgeWeight = parseInt(edge.data('weight'));
            subtractEdgeWeight(edgeWeight);
        }
    }

    // Function to handle submit action
    function handleSubmitAction(cy, actionHistory, allMSTs, ids) {
        console.log("handleSubmitAction() function is executing!");
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

        hideSubmitLineOnClick('#submit-line-en, #submit-line-el');

        const totalVertices = cy.nodes().length;
        const totalEdges = cy.edges().length;
        console.log("Total Vertices: " + totalVertices, "Total Edges: " + totalEdges);
        console.log('Total Time in Seconds:', totalSeconds);
        // Ensure totalSeconds is always at least 1 to prevent division by zero
        const timeUsed = totalSeconds > 0 ? totalSeconds : 1;
        let score = Math.floor((totalVertices * totalEdges * 100) / timeUsed);
        console.log("Calculated Score:", score);


        const lang = localStorage.getItem('language') || 'el';

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

        const popupMessage = $('#' + ids.popupMessageId);
        popupMessage.text(
            isCorrect ? messages[lang].correct : messages[lang].incorrect
        );

        if (!isCorrect) {
            score = 0;
        }

        popupMessage.append(`<br>${isCorrect ? messages[lang].correct2 : messages[lang].incorrect2}`);
        popupMessage.append(`<br>${messages[lang].score} ${score}`);
        popupMessage.addClass("");
        $('#' + ids.popupId).removeClass('hidden');

        // Stop the timer
        stopTimer();

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
