import cytoscape from 'https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.20.0/cytoscape.esm.min.js';
import { primAllMSTs, generateMSTOrderingTables } from './prim-mst.js';
import { createGraph, buildAdjacencyMatrix } from '../common/graph-utils.js';
import { updateActionTable, hasOtherConnectedBlueEdges } from './ui-utils.js';
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

    // Global variables
    window.actionHistory = [];
    window.orderingTables = [];
    window.primStartingNodeId = null;

    // 1) Only call initGame once initially, storing the new Cytoscape instance in window.cy
    window.cy = initGame(level, vertices, edgesCount, minWeight, maxWeight);

    // 2) Now attach all the jQuery button listeners *once*
    setupGlobalButtonListeners();

    //----------------------------------------------------------------
    //  initGame(...) => create the graph & set up *Cytoscape* listeners
    //----------------------------------------------------------------
    function initGame(
        level,
        vertices,
        edgesCount,
        minWeight,
        maxWeight,
        graphData = null
    ) {
        const currentLanguage = localStorage.getItem('language') || 'el';
        const suffix = currentLanguage === 'en' ? '-en' : '-el';

        const ids = {
            undoButtonId: `undo-button${suffix}`,
            actionTableId: `action-table${suffix}`,
            submitButtonId: `submit-button${suffix}`,
            popupId: `popup${suffix}`,
            popupMessageId: `popup-message${suffix}`,
            pauseButtonId: `pause-button${suffix}`,
            pausePopupId: `pause-popup${suffix}`
        };

        let nodes, edges, startingNodeId;
        if (graphData) {
            // Use existing graph data on restart
            nodes = graphData.nodes;
            edges = graphData.edges;
            startingNodeId = graphData.startingNodeId;
            window.primStartingNodeId = startingNodeId;
        } else {
            // Create brand new graph
            const graphResult = createGraph(level, vertices, edgesCount, minWeight, maxWeight);
            nodes = graphResult.nodes;
            edges = graphResult.edges;
            startingNodeId = setStartingNode(nodes);
            window.primStartingNodeId = startingNodeId;
            sessionStorage.setItem(
                'currentGraph',
                JSON.stringify({ nodes, edges, startingNodeId })
            );
        }

        logGraphDetails(edges, startingNodeId);

        const adjacencyMatrix = buildAdjacencyMatrix(nodes, edges);
        logAdjacencyMatrix(adjacencyMatrix);

        const allMSTs = primAllMSTs(adjacencyMatrix, startingNodeId);
        window.orderingTables = generateMSTOrderingTables(allMSTs);

        exportDataForDownload(edges, startingNodeId);

        const newCy = initializeCytoscape(nodes, edges, startingNodeId);

        // Set up Cytoscape event => each time we create a new graph, we rebind these
        newCy.on('tap', 'edge', evt => {
            handleEdgeSelection(evt, newCy, window.actionHistory, startingNodeId, ids.actionTableId);
        });

        // Because "undo" & "submit" buttons are handled globally, we *don't* re-bind them here

        return newCy; // Return the new Cytoscape instance
    }

    //-------------------------------------------------------------------------------------------------
    //  Setup all jQuery listeners exactly once, referencing window.cy / window.actionHistory as needed
    //-------------------------------------------------------------------------------------------------
    function setupGlobalButtonListeners() {

        // The "undo" button
        $('#undo-button-en').on('click', function() {
            handleUndoAction(
                window.cy,
                window.actionHistory,
                window.primStartingNodeId,
                'action-table-en'
            );
        });

        $('#undo-button-el').on('click', function() {
            handleUndoAction(
                window.cy,
                window.actionHistory,
                window.primStartingNodeId,
                'action-table-el'
            );
        });


        // The "submit" button
        $('#submit-button-en, #submit-button-el').on('click', function() {
            const currentLanguage = localStorage.getItem('language') || 'el';
            const suffix = currentLanguage === 'en' ? '-en' : '-el';
            const ids = {
                popupId: `popup${suffix}`,
                popupMessageId: `popup-message${suffix}`
            };

            handleSubmitAction(
                window.cy,
                window.actionHistory,
                window.orderingTables,
                ids
            );
        });

        // The "quit" button
        $('#quit-button').on('click', function() {
            stopTimer();
            window.location.href = '/play-prim';
        });

        // The "pause" button
        $('#pause-button-en, #pause-button-el').on('click', function() {
            pauseTimer();
            // We show whichever language's pause popup is currently in use
            const currentLanguage = localStorage.getItem('language') || 'el';
            const suffix = currentLanguage === 'en' ? '-en' : '-el';
            $(`#pause-popup${suffix}`).removeClass('hidden');
        });

        // "resume" inside the pause popup
        $('.resume-button').on('click', function() {
            resumeTimer();
            $(this).closest('.popup').addClass('hidden');
        });

        // "quit" inside the pause popup
        $('.quit-button').on('click', function() {
            stopTimer();
            window.location.href = '/play-prim';
        });

        // "restart" inside the SUBMIT popup
        $('.restart-button').on('click', function() {
            console.log("Restart button clicked (Approach B) — global listener.");

            const graphData = JSON.parse(sessionStorage.getItem('currentGraph'));
            const params = JSON.parse(sessionStorage.getItem('gameParams'));
            if (!graphData || !params) return;

            // 1) Destroy old Cytoscape instance
            if (window.cy && typeof window.cy.destroy === 'function') {
                console.log("Destroying old Cytoscape instance...");
                window.cy.destroy();
            }
            window.cy = null;

            // 2) Clear relevant items
            window.actionHistory = [];
            $("#action-table-en").empty();
            $("#action-table-el").empty();
            resetEdgeWeights();
            resetTimer();

            // 3) Start fresh
            setTimeout(() => startTimer(), 100);

            // 4) Re-init the game with same graph
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

        // Scores popups
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

        // Tutorial popups
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

        // Stop timer on page refresh/close
        window.addEventListener('beforeunload', function() {
            stopTimer();
        });
    }

    //---------------------------
    //  Helper / Utility methods
    //---------------------------
    function setStartingNode(nodes) {
        const idx = Math.floor(Math.random() * nodes.length);
        return nodes[idx].data.id;
    }

    function logGraphDetails(edges, startingNodeId) {
        const edgeTable = edges.map(edge => ({
            Vertex1: edge.data.source,
            Vertex2: edge.data.target,
            Weight: edge.data.weight
        }));
        console.log("Edges with Weights:");
        console.table(edgeTable);
        console.log("Starting Vertex:", startingNodeId);
    }

    function exportDataForDownload(edgeTable, startingNodeId) {
        window.exportData = { table: edgeTable, startingVertex: startingNodeId };
    }

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
                        'background-opacity': 0,
                        'label': 'data(id)',
                        'text-valign': 'center',
                        'text-halign': 'center',
                        'color': '#000000',
                        'text-outline-color': '#ffffff',
                        'text-outline-width': 1,
                        width: '40px',
                        height: '40px',
                        'font-size': '8px'
                    }
                },
                {
                    selector: `node[id="${startingNodeId}"]`,
                    style: {
                        'background-color': '#e9ecef',
                        'background-image': 'url(../img/house_starting_node.png)',
                        'background-fit': 'cover',
                        'background-opacity': 0,
                        width: '50px',
                        height: '50px'
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        width: 1,
                        'line-color': '#999',
                        'source-label': 'data(weight)',
                        'edge-distances': 'intersection',
                        'text-rotation': 'autorotate',
                        'source-text-offset': 40,
                        'source-text-margin-x': 5,
                        'source-text-margin-y': 5,
                        'text-margin-y': -5,
                        color: '#000000',
                        'font-size': '6px',
                        'text-wrap': 'wrap',
                        'overlay-padding': '10px'
                    }
                },
                {
                    selector: 'edge[data(alt) = "left"]',
                    style: {
                        'text-margin-x': -8
                    }
                },
                {
                    selector: 'edge[data(alt) = "right"]',
                    style: {
                        'text-margin-x': 8
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

    //---------------------------
    //  In-game event handlers
    //---------------------------
    function handleEdgeSelection(evt, cy, actionHistory, startingNodeId, actionTableId) {
        const edge = evt.target;
        const existingActionIndex = actionHistory.findIndex(a => a.edge.id() === edge.id());
        if (existingActionIndex !== -1) {
            handleUndoAction(cy, actionHistory, startingNodeId, actionTableId);
            return;
        }
        edge.style({ width: 4, 'line-color': '#94d95f' });
        const sourceNode = cy.$(`#${edge.data('source')}`);
        const targetNode = cy.$(`#${edge.data('target')}`);

        setNodeStyle(sourceNode, startingNodeId, '#459e09', '#94d95f');
        setNodeStyle(targetNode, startingNodeId, '#459e09', '#94d95f');

        actionHistory.push({ edge, sourceNode, targetNode });
        updateActionTable(actionHistory, actionTableId);

        const w = parseInt(edge.data('weight'));
        addEdgeWeight(w);
    }

    function handleUndoAction(cy, actionHistory, startingNodeId, actionTableId) {
        if (actionHistory.length > 0) {
            const { edge, sourceNode, targetNode } = actionHistory.pop();
            edge.style({ width: 1, 'line-color': '#999' });

            resetNodeStyle(sourceNode, startingNodeId, cy);
            resetNodeStyle(targetNode, startingNodeId, cy);

            updateActionTable(actionHistory, actionTableId);

            const w = parseInt(edge.data('weight'));
            subtractEdgeWeight(w);
        }
    }

    function setNodeStyle(node, startingNodeId, startingNodeColor, otherNodeColor) {
        if (node.id() === startingNodeId) {
                  node.style({
                          'background-color': startingNodeColor,
                          'background-opacity': 1
                  });
        } else {
                  node.style({
                          'background-color': otherNodeColor,
                          'background-opacity': 1
                  });
        }
    }

    function resetNodeStyle(node, startingNodeId, cy) {
        // If NOT in the MST, revert to transparent
        if (!isNodeInTable(actionHistory, node.id())) {
            node.style({
                'background-color': '#e9ecef',
                'background-opacity': 0
            });
        }
        else {
            // If it’s in the MST, keep it green & opaque
            if (node.id() === startingNodeId) {
                node.style({
                    'background-color': '#459e09',
                    'background-opacity': 1
                });
            } else {
                node.style({
                    'background-color': '#94d95f',
                    'background-opacity': 1
                });
            }
        }
    }


    function objectsEqual(a, b) {
        return a.Vertex1 === b.Vertex1 && a.Vertex2 === b.Vertex2 && a.Weight === b.Weight;
    }

    function arraysEqual(arr1, arr2) {
        if (arr1.length !== arr2.length) return false;
        for (let i = 0; i < arr1.length; i++) {
            if (!objectsEqual(arr1[i], arr2[i])) return false;
        }
        return true;
    }

    function buildComparisonTableHTML(correctSol, playerSol, mismatchIndex) {
        // mismatchIndex = the row where they first differ, or -1 if none
        // We'll produce an HTML table with two columns: "Correct" and "Player"
        // We show the entire length of both solutions, row by row.

        const maxLen = Math.max(correctSol.length, playerSol.length);

        let html = `
      <table style="border-collapse: collapse;">
        <thead>
          <tr>
            <th style="padding: 4px; border: 1px solid #ccc;">Correct MST</th>
            <th style="padding: 4px; border: 1px solid #ccc;">Your MST</th>
          </tr>
        </thead>
        <tbody>
    `;

        for (let i = 0; i < maxLen; i++) {
            const correctEdge = correctSol[i];
            const playerEdge = playerSol[i];

            // Convert edge to text or show blank if no edge
            const correctText = correctEdge
                ? `${correctEdge.Vertex1} - ${correctEdge.Vertex2} (w=${correctEdge.Weight})`
                : '—';
            const playerText = playerEdge
                ? `${playerEdge.Vertex1} - ${playerEdge.Vertex2} (w=${playerEdge.Weight})`
                : '—';

            // If i == mismatchIndex => color the row red
            const rowStyle = (i === mismatchIndex) ? 'background-color: #fdd;' : '';

            html += `
          <tr style="${rowStyle}">
            <td style="padding:4px; border:1px solid #ccc;">${correctText}</td>
            <td style="padding:4px; border:1px solid #ccc;">${playerText}</td>
          </tr>
        `;
        }

        html += `</tbody></table>`;
        return html;
    }


    function findMismatchIndex(playerSol, correctSol) {
        // We'll compare each edge in order, until they differ
        const len = Math.min(playerSol.length, correctSol.length);
        for (let i = 0; i < len; i++) {
            if (
                playerSol[i].Vertex1 !== correctSol[i].Vertex1 ||
                playerSol[i].Vertex2 !== correctSol[i].Vertex2 ||
                playerSol[i].Weight  !== correctSol[i].Weight
            ) {
                return i; // first mismatch
            }
        }
        // If we get here, it means all matched up to 'len'
        // Possible mismatch if lengths differ
        if (playerSol.length !== correctSol.length) {
            return len;
        }
        // Otherwise they are fully equal
        return -1; // indicates no mismatch
    }


    function handleSubmitAction(cy, actionHistory, allMSTs, ids) {
        console.log("handleSubmitAction() is executing!");

        // 1) Build playerSolution
        const playerSolution = actionHistory.map(({ edge }) => {
            let v1 = parseInt(edge.data('source'));
            let v2 = parseInt(edge.data('target'));
            const weight = parseInt(edge.data('weight'));
            if (v1 > v2) [v1, v2] = [v2, v1];
            return { Vertex1: v1, Vertex2: v2, Weight: weight };
        });
        console.log("Player's solution (canonical):", JSON.stringify(playerSolution, null, 2));

        // 2) Check if ordering is valid
        function isValidPrimOrdering(ordering, startingNode) {
            const tree = new Set([ startingNode ]);
            for (let edge of ordering) {
                const { Vertex1, Vertex2 } = edge;
                const inTree1 = tree.has(Vertex1);
                const inTree2 = tree.has(Vertex2);
                if ((inTree1 && !inTree2) || (inTree2 && !inTree1)) {
                    tree.add(inTree1 ? Vertex2 : Vertex1);
                } else {
                    return false;
                }
            }
            return true;
        }

        // 3) See if the player's solution matches at least one correct MST ordering
        let isCorrect = false;
        let correctOrderingFound = null;   // We'll store the correct ordering that we compare against
        allMSTs.forEach(oneMST => {
            // oneMST is an array of [u, v, w], but we've also got orderingTables for actual permutations
        });

        // We'll search in window.orderingTables for a valid ordering
        for (let tableObj of window.orderingTables) {
            for (let ordering of tableObj.orderings) {
                // ordering is an array of {Vertex1, Vertex2, Weight} already 1-based
                if (!isValidPrimOrdering(ordering, parseInt(window.primStartingNodeId))) {
                    continue;
                }
                // Compare in full
                if (arraysEqual(playerSolution, ordering)) {
                    isCorrect = true;
                    correctOrderingFound = ordering;
                    break;
                }
                // If correct so far, store for partial comparison
                if (!correctOrderingFound) {
                    // We'll keep the first valid MST ordering (in case we want partial compare)
                    correctOrderingFound = ordering;
                }
            }
            if (isCorrect) break;
        }

        // 4) Stop timer, compute score, etc. (unchanged)
        stopTimer();
        const totalVertices = cy.nodes().length;
        const totalEdges = cy.edges().length;
        const timeUsed = totalSeconds > 0 ? totalSeconds : 1;
        let score = Math.floor((totalVertices * totalEdges * 100) / timeUsed);
        console.log("Calculated Score:", score);

        // Language messages
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

        // 5) Show message in popup
        if (!isCorrect) score = 0;
        const popupMessage = $('#' + ids.popupMessageId);
        popupMessage.text(isCorrect ? messages[lang].correct : messages[lang].incorrect);
        popupMessage.append(`<br>${isCorrect ? messages[lang].correct2 : messages[lang].incorrect2}`);
        popupMessage.append(`<br>${messages[lang].score} ${score}`);
        $('#' + ids.popupId).removeClass('hidden');

        // NEW: clear any old comparison table
        const compareContainerId = (lang === 'en') ? "#comparison-table-en" : "#comparison-table-el";
        $(compareContainerId).empty();

        // 6) If the user is incorrect, build the “where you messed up” table
        if (!isCorrect && correctOrderingFound) {
            const mismatchIndex = findMismatchIndex(playerSolution, correctOrderingFound);
            console.log("Mismatch index found at:", mismatchIndex);

            // Build an HTML table to show them side by side
            const compareHTML = buildComparisonTableHTML(
                correctOrderingFound,
                playerSolution,
                mismatchIndex
            );

            // Insert into the popup
            $(compareContainerId).html(compareHTML);
        }

        // 7) If correct, update the player's score
        if (score > 0) {
            const username = sessionStorage.getItem('username');
            if (username) {
                const method = $('#gameMethod').val();
                updatePlayerScore(username, score, method)
                    .then((result) => { console.log('Score added successfully!', result); })
                    .catch((err) => { console.error('Error adding score:', err); });
            }
        }
    }


    window.addEventListener('beforeunload', function() {
        stopTimer();
    });
});
