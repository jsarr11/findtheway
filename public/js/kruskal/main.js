import cytoscape from 'https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.20.0/cytoscape.esm.min.js';
import { kruskalAllMSTs, generateMSTOrderingTables } from './kruskal-mst.js';
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
    // Global variable to hold the ordering tables generated from MSTs.
    let orderingTables = [];

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
        // Generate ordering tables from the MSTs.
        orderingTables = generateMSTOrderingTables(allMSTs);

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
                        'background-image': 'url(../img/house.png)',
                        'background-fit': 'cover',
                        'background-opacity': 1,
                        'label': 'data(id)',
                        'text-valign': 'center',
                        'text-halign': 'center',
                        'color': '#000000',
                        'text-outline-color': '#ffffff',
                        'text-outline-width': 3,
                        'width': '40px',
                        'height': '40px',
                        'font-size': '12px'
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'width': 1,
                        'line-color': '#999',
                        'source-label': 'data(weight)',
                        'edge-distances': 'intersection',
                        'text-rotation': 'autorotate',
                        'source-text-offset': 40,
                        'source-text-margin-x': 5,
                        'source-text-margin-y': 5,
                        'color': '#000000',
                        'font-size': '6px',
                        'text-wrap': 'wrap',
                        'overlay-padding': '10px'
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

    // Helper functions for deep comparison
    function objectsEqual(a, b) {
        const aKeys = Object.keys(a);
        const bKeys = Object.keys(b);
        if (aKeys.length !== bKeys.length) return false;
        for (let key of aKeys) {
            if (a[key] !== b[key]) return false;
        }
        return true;
    }

    function arraysEqual(arr1, arr2) {
        if (arr1.length !== arr2.length) return false;
        for (let i = 0; i < arr1.length; i++) {
            if (!objectsEqual(arr1[i], arr2[i])) return false;
        }
        return true;
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

        // Submit button event
        $('#' + ids.submitButtonId).off('click').on('click', function() {
            console.log("Submit button clicked!");
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

        // Restart button event
        $(`#${ids.pausePopupId} .restart-button`).off('click').on('click', () => {
            console.log("Restart button clicked");

            const savedGraph = sessionStorage.getItem('currentGraph');
            const params = JSON.parse(sessionStorage.getItem('gameParams'));

            if (params) {
                console.log("Restarting game with same graph...");

                if (typeof window.cy !== "undefined" && window.cy !== null) {
                    if (typeof window.cy.destroy === "function") {
                        console.log("Destroying Cytoscape instance...");
                        window.cy.destroy();
                    }
                }

                window.cy = null;
                actionHistory = [];
                $("#action-table-en").empty();
                $("#action-table-el").empty();
                resetEdgeWeights();
                resetTimer();

                setTimeout(() => {
                    console.log("Calling startTimer() after resetTimer()");
                    startTimer();
                }, 100);

                window.cy = initGame(params.level, params.vertices, params.edgesCount,
                    params.minWeight, params.maxWeight, savedGraph ? JSON.parse(savedGraph) : null);

                $(`#${ids.pausePopupId}`).addClass('hidden');
            }
        });

        // Quit button inside pause popup
        $(`#${ids.pausePopupId} .quit-button`).off('click').on('click', () => {
            stopTimer();
            window.location.href = '/play-kruskal';
        });

        // 1) Attach click events for open/close of Greek popup
        $("#scores-button-el").on("click", function() {
            // Show Greek popup
            $("#scores-popup-el").removeClass("hidden");
            // Then load the Greek scores
        });
        $("#close-scores-popup-el").on("click", function() {
            $("#scores-popup-el").addClass("hidden");
        });

        // 2) Attach click events for open/close of English popup
        $("#scores-button-en").on("click", function() {
            // Show English popup
            $("#scores-popup-en").removeClass("hidden");
            // Then load the English scores
        });
        $("#close-scores-popup-en").on("click", function() {
            $("#scores-popup-en").addClass("hidden");
        });
        // Greek tutorial popup
        $("#tutorial-button-el").on("click", function() {
            $("#tutorial-popup-el").removeClass("hidden");
        });
        $("#close-tutorial-popup-el").on("click", function() {
            $("#tutorial-popup-el").addClass("hidden");
        });

        // English tutorial popup
        $("#tutorial-button-en").on("click", function() {
            $("#tutorial-popup-en").removeClass("hidden");
        });
        $("#close-tutorial-popup-en").on("click", function() {
            $("#tutorial-popup-en").addClass("hidden");
        });


        window.addEventListener('beforeunload', function() {
            stopTimer();
        });
    }

    // Function to handle edge selection
    function handleEdgeSelection(evt, cy, actionHistory, actionTableId) {
        const edge = evt.target;
        const existingActionIndex = actionHistory.findIndex(action => action.edge.id() === edge.id());
        if (existingActionIndex !== -1) {
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
            const edgeWeight = parseInt(edge.data('weight'));
            subtractEdgeWeight(edgeWeight);
        }
    }

    // Function to handle submit action using deep object comparison
    function handleSubmitAction(cy, actionHistory, allMSTs, ids) {
        console.log("handleSubmitAction() is executing!");

        // Build player's solution with 1-based numbering (preserving click order)
        const playerSolution = actionHistory.map(({ edge }) => {
            let v1 = parseInt(edge.data('source'));
            let v2 = parseInt(edge.data('target'));
            const weight = parseInt(edge.data('weight'));
            if (v1 > v2) { // swap so that smaller vertex is Vertex1
                [v1, v2] = [v2, v1];
            }
            return { Vertex1: v1, Vertex2: v2, Weight: weight };
        });

        console.log("Player's solution (canonical):", playerSolution);

        // **FIX: Prevent empty solutions from being considered correct**
        if (playerSolution.length === 0) {
            console.log("No edges selected. Submission is invalid.");
            const lang = localStorage.getItem('language') || 'el';
            const messages = {
                en: {
                    incorrect: "Your answer is not correct...",
                    incorrect2: "You didn't select any edges! Try again.",
                    score: "Your Score is: 0"
                },
                el: {
                    incorrect: "Η απάντησή σας δεν είναι σωστή...",
                    incorrect2: "Δεν επιλέξατε καμία ακμή! Προσπαθήστε ξανά.",
                    score: "Το Σκορ σας είναι: 0"
                }
            };

            const popupMessage = $('#' + ids.popupMessageId);
            popupMessage.text(messages[lang].incorrect);
            popupMessage.append(`<br>${messages[lang].incorrect2}`);
            popupMessage.append(`<br>${messages[lang].score}`);
            $('#' + ids.popupId).removeClass('hidden');

            stopTimer();
            return;
        }

        // Compare player's solution (without normalization) against ordering tables.
        let isCorrect = false;
        orderingTables.forEach(item => {
            item.orderings.forEach(ordering => {
                if (arraysEqual(playerSolution, ordering)) {
                    isCorrect = true;
                }
            });
        });

        if (!isCorrect) {
            console.log("No valid ordering matched the player's solution.");
        }

        hideSubmitLineOnClick('#submit-line-en, #submit-line-el');

        const totalVertices = cy.nodes().length;
        const totalEdges = cy.edges().length;
        console.log("Total Vertices:", totalVertices, "Total Edges:", totalEdges);
        console.log("Total Time in Seconds:", totalSeconds);
        const timeUsed = totalSeconds > 0 ? totalSeconds : 1;
        let score = isCorrect ? Math.floor((totalVertices * totalEdges * 100) / timeUsed) : 0;
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
        popupMessage.text(isCorrect ? messages[lang].correct : messages[lang].incorrect);
        popupMessage.append(`<br>${isCorrect ? messages[lang].correct2 : messages[lang].incorrect2}`);
        popupMessage.append(`<br>${messages[lang].score} ${score}`);
        $('#' + ids.popupId).removeClass('hidden');

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

    window.addEventListener('beforeunload', function() {
        stopTimer();
    });
});
