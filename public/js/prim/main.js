import cytoscape from 'https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.20.0/cytoscape.esm.min.js';
import { primAllMSTs, generateMSTOrderingTables  } from './prim-mst.js';
import { createGraph, buildAdjacencyMatrix } from '../common/graph-utils.js';
import { updateActionTable, hasOtherConnectedBlueEdges } from './ui-utils.js';
import { isEdgeInTable, isNodeInTable, logAdjacencyMatrix } from '../common/common.js';
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
    let orderingTables = [];
    let primStartingNodeId;

    // Initialize the game
    initGame(level, vertices, edgesCount, minWeight, maxWeight);

    function initGame(level, vertices, edgesCount, minWeight, maxWeight, graphData = null) {
        const currentLanguage = localStorage.getItem('language') || 'el';
        const suffix = currentLanguage === 'en' ? '-en' : '-el';

        const ids = {
            undoButtonId: `undo-button${suffix}`,
            actionTableId: `action-table${suffix}`,
            submitButtonId: `submit-button${suffix}`,
            popupId: `popup${suffix}`,
            popupMessageId: `popup-message${suffix}`,
            popupCloseId: `popup-close${suffix}`,
            pauseButtonId: `pause-button${suffix}`,
            pausePopupId: `pause-popup${suffix}`
        };

        let nodes, edges, startingNodeId;
        if (graphData) {
            // Use existing graph data
            nodes = graphData.nodes;
            edges = graphData.edges;
            startingNodeId = graphData.startingNodeId;
        } else {
            // Generate new graph
            const graphResult = createGraph(level, vertices, edgesCount, minWeight, maxWeight);
            nodes = graphResult.nodes;
            edges = graphResult.edges;
            startingNodeId = setStartingNode(nodes);
            primStartingNodeId = startingNodeId;
            sessionStorage.setItem('currentGraph', JSON.stringify({ nodes, edges, startingNodeId }));
        }



        logGraphDetails(edges, startingNodeId);

        const adjacencyMatrix = buildAdjacencyMatrix(nodes, edges);
        logAdjacencyMatrix(adjacencyMatrix);

        const allMSTs = primAllMSTs(adjacencyMatrix, startingNodeId);
        orderingTables = generateMSTOrderingTables(allMSTs);

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
                        'source-label': 'data(weight)',
                        'edge-distances': 'intersection',
                        'text-rotation': 'autorotate',
                        'source-text-offset': 40,
                        'source-text-margin-x': 5,
                        'source-text-margin-y': 5,
                        'text-margin-y': -5,
                        'color': '#000000',
                        'font-size': '6px',
                        'text-wrap': 'wrap',
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
        // Existing edge selection functionality
        cy.on('tap', 'edge', function(evt) {
            handleEdgeSelection(evt, cy, actionHistory, startingNodeId, ids.actionTableId);
        });

        // Existing undo button functionality
        $(`#${ids.undoButtonId}`).click(() => {
            handleUndoAction(cy, actionHistory, startingNodeId, ids.actionTableId);
        });

        // Existing submit button functionality
        $(`#${ids.submitButtonId}`).click(() => {
            handleSubmitAction(cy, actionHistory, allMSTs, ids);
        });

        // Existing quit button functionality
        $('#quit-button').click(() => {
            stopTimer();
            window.location.href = '/play-prim';
        });

        // New pause button functionality
        $(`#${ids.pauseButtonId}`).click(() => {
            pauseTimer();
            $(`#${ids.pausePopupId}`).removeClass('hidden');
        });

        // New resume button functionality
        $(`#${ids.pausePopupId} .resume-button`).click(() => {
            resumeTimer();
            $(`#${ids.pausePopupId}`).addClass('hidden');
        });

        // New restart button functionality
        $(`#${ids.popupId} .restart-button`).click(() => {
            console.log("Restart button clicked (from SUBMIT popup)");

            const graphData = JSON.parse(sessionStorage.getItem('currentGraph'));
            const params = JSON.parse(sessionStorage.getItem('gameParams'));

            if (graphData && params) {
                // Destroy Cytoscape instance safely
                if (typeof window.cy !== "undefined" && window.cy !== null) {
                    if (typeof window.cy.destroy === "function") {
                        console.log("Destroying Cytoscape instance...");
                        window.cy.destroy();
                    }
                }
                window.cy = null;  // Clear Cytoscape reference

                // Reset or clear relevant items
                actionHistory = [];
                $("#action-table-en").empty();
                $("#action-table-el").empty();
                resetEdgeWeights();
                resetTimer();

                // Restart the timer properly after reset
                setTimeout(() => {
                    startTimer();
                }, 100);

                // Reinitialize the game
                window.cy = initGame(
                    params.level,
                    params.vertices,
                    params.edgesCount,
                    params.minWeight,
                    params.maxWeight,
                    graphData
                );

                // Hide the SUBMIT popup
                $(`#${ids.popupId}`).addClass('hidden');
            }
        });
        // New quit button functionality (inside pause popup)
        $(`#${ids.pausePopupId} .quit-button`).click(() => {
            stopTimer();
            window.location.href = '/play-prim';
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


        // Existing beforeunload functionality to stop timer on page refresh/close
        window.addEventListener('beforeunload', () => {
            stopTimer();
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


    // Function to handle submit action
    function handleSubmitAction(cy, actionHistory, allMSTs, ids) {
        console.log("handleSubmitAction() is executing!");

        // Build player's solution (assume vertices are already 1-based in Prim)
        const playerSolution = actionHistory.map(({ edge }) => {
            let v1 = parseInt(edge.data('source'));
            let v2 = parseInt(edge.data('target'));
            const weight = parseInt(edge.data('weight'));
            // Ensure canonical edge ordering: smaller vertex first.
            if (v1 > v2) {
                [v1, v2] = [v2, v1];
            }
            return { Vertex1: v1, Vertex2: v2, Weight: weight };
        });
        console.log("Player's solution (canonical):", JSON.stringify(playerSolution, null, 2));

        /**
         * Checks if an ordering (array of edge objects) is valid for Prim,
         * given a starting node.
         * The ordering is assumed to be in the order in which edges are added.
         * Each edge must connect a vertex in the tree to one not in the tree.
         */
        function isValidPrimOrdering(ordering, startingNode) {
            // Initialize the tree with the starting node.
            const tree = new Set();
            tree.add(startingNode);

            for (let edge of ordering) {
                // For each edge, check if one vertex is already in tree and the other is not.
                const { Vertex1, Vertex2 } = edge;
                const inTree1 = tree.has(Vertex1);
                const inTree2 = tree.has(Vertex2);

                // Valid if exactly one vertex is in the tree.
                if ((inTree1 && !inTree2) || (inTree2 && !inTree1)) {
                    // Add the new vertex.
                    tree.add(inTree1 ? Vertex2 : Vertex1);
                } else {
                    // Either both are in the tree (cycle) or both are not (disconnected).
                    return false;
                }
            }
            return true;
        }


        // Instead of normalizing (which might reorder the solution), use the raw array.
        let isCorrect = false;
        // Compare player's solution against every ordering table generated by Prim.
        orderingTables.forEach(item => {
            console.log(`Comparing against Prim MST #${item.mstIndex + 1} ordering(s):`);
            item.orderings.forEach((ordering, orderIndex) => {
                // Only consider ordering tables that are valid per Prim's rules:
                if (!isValidPrimOrdering(ordering, parseInt(primStartingNodeId))) {
                    console.log(`-- Ordering ${orderIndex + 1} is invalid per Prim rules; skipping.`);
                    return;
                }

                console.log(`-- Ordering ${orderIndex + 1} (valid):`, JSON.stringify(ordering, null, 2));
                console.log("-- Player solution:", JSON.stringify(playerSolution, null, 2));
                console.log("Comparison result (JSON):", JSON.stringify(playerSolution) === JSON.stringify(ordering));
                if (arraysEqual(playerSolution, ordering)) {
                    console.log("Player's solution matches ordering", orderIndex + 1, "for Prim MST #", item.mstIndex + 1);
                    isCorrect = true;
                }
            });
        });


        if (!isCorrect) {
            console.log("No valid ordering matched the player's solution.");
        }

        // hideSubmitLineOnClick('#submit-line-en, #submit-line-el');

        const totalVertices = cy.nodes().length;
        const totalEdges = cy.edges().length;
        console.log("Total Vertices:", totalVertices, "Total Edges:", totalEdges);
        console.log("Total Time in Seconds:", totalSeconds);
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
        popupMessage.text(isCorrect ? messages[lang].correct : messages[lang].incorrect);
        if (!isCorrect) {
            score = 0;
        }
        popupMessage.append(`<br>${isCorrect ? messages[lang].correct2 : messages[lang].incorrect2}`);
        popupMessage.append(`<br>${messages[lang].score} ${score}`);
        popupMessage.addClass("");
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

    // stop time on back button from browser
    window.addEventListener('beforeunload', function() {
        stopTimer();
    });

});
