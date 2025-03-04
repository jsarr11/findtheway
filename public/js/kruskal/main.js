import cytoscape from 'https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.20.0/cytoscape.esm.min.js';
import { kruskalAllMSTs, generateMSTOrderingTables } from './kruskal-mst.js';
import { createGraph, buildAdjacencyMatrix } from '../common/graph-utils.js';
import { updateActionTable } from './ui-utils.js';
import { isEdgeInTable, isNodeInTable, logAdjacencyMatrix } from '../common/common.js';
import '../common/timer.js';
import {
    totalSeconds, stopTimer, startTimer,
    pauseTimer, resumeTimer, resetTimer
} from '../common/timer.js';
import '../common/edgeWeights.js';
import {
    addEdgeWeight, subtractEdgeWeight, resetEdgeWeights
} from '../common/edgeWeights.js';
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

    // Make these global so we can use them in our global button listeners
    window.actionHistory = [];
    window.orderingTables = [];

    // 1) Initialize the game once, storing the new Cytoscape instance in window.cy
    window.cy = initGame(level, vertices, edgesCount, minWeight, maxWeight);

    // 2) Set up all the jQuery button listeners exactly once
    setupGlobalButtonListeners();

    //-------------------------------------------------------------------------
    //  A) initGame(...) => sets up the Cytoscape instance & MST logic
    //-------------------------------------------------------------------------
    function initGame(
        level,
        vertices,
        edgesCount,
        minWeight,
        maxWeight,
        graphData = null
    ) {
        // Pick language suffix for ID references
        const currentLanguage = localStorage.getItem('language') || 'el';
        const suffix = currentLanguage === 'en' ? '-en' : '-el';

        const ids = {
            undoButtonId: `undo-button${suffix}`,
            actionTableId: `action-table${suffix}`,
            submitButtonId: `submit-button-kruskal${suffix}`,
            popupId: `popup${suffix}`,
            popupMessageId: `popup-message${suffix}`,
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

        // Build adjacency & find MSTs
        const adjacencyMatrix = buildAdjacencyMatrix(nodes, edges);
        logAdjacencyMatrix(adjacencyMatrix);
        const allMSTs = kruskalAllMSTs(adjacencyMatrix);
        // Generate all ordering tables from MSTs
        window.orderingTables = generateMSTOrderingTables(allMSTs);

        exportDataForDownload(edges);

        // 1) Create Cytoscape
        const newCy = initializeCytoscape(nodes, edges);

        // 2) Only the Cytoscape event for edge selection goes here (Approach B)
        newCy.on('tap', 'edge', evt => {
            handleEdgeSelection(evt, newCy, window.actionHistory, ids.actionTableId);
        });

        // Return the new Cytoscape instance
        return newCy;
    }

    //-------------------------------------------------------------------------
    //  B) Attach global jQuery event listeners exactly once (Approach B)
    //-------------------------------------------------------------------------
    function setupGlobalButtonListeners() {
        // We'll attach all the button events for both English/Greek IDs here

        // 1) Undo button
        $('#undo-button-en, #undo-button-el').on('click', function() {
            // We'll call handleUndoAction for both possible language tables
            handleUndoAction(window.cy, window.actionHistory, 'action-table-en');
            handleUndoAction(window.cy, window.actionHistory, 'action-table-el');
        });

        // 2) Submit button
        $('#submit-button-kruskal-en, #submit-button-kruskal-el').on('click', function() {
            const currentLanguage = localStorage.getItem('language') || 'el';
            const suffix = currentLanguage === 'en' ? '-en' : '-el';
            const ids = {
                popupId: `popup${suffix}`,
                popupMessageId: `popup-message${suffix}`
            };
            handleSubmitAction(window.cy, window.actionHistory, window.orderingTables, ids);
        });

        // 3) Quit button (outside popups)
        $('#quit-button').on('click', function() {
            stopTimer();
            window.location.href = '/play-kruskal';
        });

        // 4) Pause button
        $('#pause-button-en, #pause-button-el').on('click', function() {
            pauseTimer();
            const currentLanguage = localStorage.getItem('language') || 'el';
            const suffix = currentLanguage === 'en' ? '-en' : '-el';
            $(`#pause-popup${suffix}`).removeClass('hidden');
        });

        // 5) Resume & quit inside pause popup (both languages)
        $('.resume-button').on('click', function() {
            resumeTimer();
            $(this).closest('.popup').addClass('hidden');
        });
        $('.quit-button').on('click', function() {
            stopTimer();
            window.location.href = '/play-kruskal';
        });

        // 6) Restart button in the SUBMIT popup
        $('.restart-button').on('click', function() {
            console.log("Restart button clicked (Approach B for Kruskal).");
            const graphData = JSON.parse(sessionStorage.getItem('currentGraph'));
            const params = JSON.parse(sessionStorage.getItem('gameParams'));
            if (!graphData || !params) return;

            // Destroy old Cytoscape instance
            if (window.cy && typeof window.cy.destroy === 'function') {
                window.cy.destroy();
            }
            window.cy = null;

            window.actionHistory = [];
            $('#action-table-en').empty();
            $('#action-table-el').empty();
            resetEdgeWeights();
            resetTimer();

            setTimeout(() => startTimer(), 100);

            // Re-init the game with the same graph
            window.cy = initGame(
                params.level,
                params.vertices,
                params.edgesCount,
                params.minWeight,
                params.maxWeight,
                graphData
            );

            // Hide the SUBMIT popup
            $(this).closest('.popup').addClass('hidden');
        });

        // 7) Scores buttons
        $("#scores-button-el").on("click", function() {
            $("#scores-popup-el").removeClass("hidden");
        });
        $("#close-scores-popup-el").on("click", function() {
            $("#scores-popup-el").addClass("hidden");
        });
        $("#scores-button-en").on("click", function() {
            $("#scores-popup-en").removeClass("hidden");
        });
        $("#close-scores-popup-en").on("click", function() {
            $("#scores-popup-en").addClass("hidden");
        });

        // 8) Tutorial buttons
        $("#tutorial-button-el").on("click", function() {
            $("#tutorial-popup-el").removeClass("hidden");
        });
        $("#close-tutorial-popup-el").on("click", function() {
            $("#tutorial-popup-el").addClass("hidden");
        });
        $("#tutorial-button-en").on("click", function() {
            $("#tutorial-popup-en").removeClass("hidden");
        });
        $("#close-tutorial-popup-en").on("click", function() {
            $("#tutorial-popup-en").addClass("hidden");
        });

        // 9) Stop timer on page refresh/close
        window.addEventListener('beforeunload', () => {
            stopTimer();
        });
    }

    //-------------------------------------------------------------------------
    //  C) Support / Utility functions
    //-------------------------------------------------------------------------
    function logGraphDetails(edges) {
        const edgeTable = edges.map(edge => ({
            Vertex1: edge.data.source,
            Vertex2: edge.data.target,
            Weight: edge.data.weight
        }));
        console.log("Vertices and Edges with Weights:");
        console.table(edgeTable);
    }

    function exportDataForDownload(edgeTable) {
        window.exportData = { table: edgeTable };
    }

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

    // Edge selection
    function handleEdgeSelection(evt, cy, actionHistory, actionTableId) {
        const edge = evt.target;
        const existingActionIndex = actionHistory.findIndex(a => a.edge.id() === edge.id());
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

    // Undo
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

    // Submit
    function handleSubmitAction(cy, actionHistory, allMSTs, ids) {
        console.log("handleSubmitAction() is executing!");

        const playerSolution = actionHistory.map(({ edge }) => {
            let v1 = parseInt(edge.data('source'));
            let v2 = parseInt(edge.data('target'));
            const weight = parseInt(edge.data('weight'));
            if (v1 > v2) [v1, v2] = [v2, v1];
            return { Vertex1: v1, Vertex2: v2, Weight: weight };
        });
        console.log("Player's solution (canonical):", playerSolution);

        // Compare player's solution
        let isCorrect = false;
        allMSTs.forEach(mst => {
            // ...
        });
        window.orderingTables.forEach(item => {
            item.orderings.forEach(ordering => {
                if (arraysEqual(playerSolution, ordering)) {
                    isCorrect = true;
                }
            });
        });

        if (!isCorrect) {
            console.log("No valid ordering matched the player's solution.");
        }

        stopTimer();

        const totalVertices = cy.nodes().length;
        const totalEdges = cy.edges().length;
        const timeUsed = totalSeconds > 0 ? totalSeconds : 1;
        let score = isCorrect ? Math.floor((totalVertices * totalEdges * 100) / timeUsed) : 0;

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

        if (score > 0) {
            const username = sessionStorage.getItem('username');
            if (username) {
                const method = $('#gameMethod').val(); // "kruskal"
                updatePlayerScore(username, score, method)
                    .then((result) => {
                        console.log('Score added successfully!', result);
                    })
                    .catch((err) => {
                        console.error('Error adding score:', err);
                    });
            }
        }
    }

    // On page refresh/close
    window.addEventListener('beforeunload', function() {
        stopTimer();
    });
});
