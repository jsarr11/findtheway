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

    // Global
    window.actionHistory = [];
    window.orderingTables = [];

    // 1) Create the graph & MST logic
    window.cy = initGame(level, vertices, edgesCount, minWeight, maxWeight);

    // 2) Set up button listeners
    setupGlobalButtonListeners();

    /********************************************************************
     *  initGame(...) => sets up the Cytoscape instance & MST logic
     ********************************************************************/
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
            nodes = graphData.nodes;
            edges = graphData.edges;
        } else {
            const result = createGraph(level, vertices, edgesCount, minWeight, maxWeight);
            nodes = result.nodes;
            edges = result.edges;
            sessionStorage.setItem('currentGraph', JSON.stringify({ nodes, edges }));
        }

        logGraphDetails(edges);

        // Build adjacency & find MSTs
        const adjacencyMatrix = buildAdjacencyMatrix(nodes, edges);
        logAdjacencyMatrix(adjacencyMatrix);

        const allMSTs = kruskalAllMSTs(adjacencyMatrix);
        window.orderingTables = generateMSTOrderingTables(allMSTs);

        exportDataForDownload(edges);

        // Create Cytoscape
        const newCy = initializeCytoscape(nodes, edges);

        updateActionTable(window.actionHistory, "action-table-en");
        updateActionTable(window.actionHistory, "action-table-el");

        // Hook up edge selection
        newCy.on('tap', 'edge', evt => {
            handleEdgeSelection(evt, newCy, window.actionHistory, ids.actionTableId);
        });

        return newCy;
    }

    /********************************************************************
     *  Setup jQuery event listeners exactly once
     ********************************************************************/
    function setupGlobalButtonListeners() {
        // Undo
        $('#undo-button-en').on('click', function() {
            handleUndoAction(window.cy, window.actionHistory, 'action-table-en');
        });
        $('#undo-button-el').on('click', function() {
            handleUndoAction(window.cy, window.actionHistory, 'action-table-el');
        });

        // Submit
        $('#submit-button-kruskal-en, #submit-button-kruskal-el').on('click', function() {
            const currentLanguage = localStorage.getItem('language') || 'el';
            const suffix = currentLanguage === 'en' ? '-en' : '-el';
            const ids = {
                popupId: `popup${suffix}`,
                popupMessageId: `popup-message${suffix}`
            };
            handleSubmitAction(window.cy, window.actionHistory, window.orderingTables, ids);
        });

        // Quit
        $('#quit-button').on('click', function() {
            stopTimer();
            window.location.href = '/play-kruskal';
        });

        // Pause
        $('#pause-button-en, #pause-button-el').on('click', function() {
            pauseTimer();
            const currentLanguage = localStorage.getItem('language') || 'el';
            const suffix = currentLanguage === 'en' ? '-en' : '-el';
            $(`#pause-popup${suffix}`).removeClass('hidden');
        });

        $('.resume-button').on('click', function() {
            resumeTimer();
            $(this).closest('.popup').addClass('hidden');
        });
        $('.quit-button').on('click', function() {
            stopTimer();
            window.location.href = '/play-kruskal';
        });

        // Restart
        $('.restart-button').on('click', function() {
            const graphData = JSON.parse(sessionStorage.getItem('currentGraph'));
            const params = JSON.parse(sessionStorage.getItem('gameParams'));
            if (!graphData || !params) return;

            if (window.cy && typeof window.cy.destroy === 'function') {
                window.cy.destroy();
            }
            window.cy = null;

            window.actionHistory = [];
            $('#action-table-en').empty();
            $('#action-table-el').empty();
            resetEdgeWeights();
            resetTimer();

            // Hide the table immediately
            updateActionTable(window.actionHistory, "action-table-en");
            updateActionTable(window.actionHistory, "action-table-el");

            setTimeout(() => startTimer(), 100);

            // Re-init
            window.cy = initGame(
                params.level,
                params.vertices,
                params.edgesCount,
                params.minWeight,
                params.maxWeight,
                graphData
            );

            $(this).closest('.popup').addClass('hidden');
        });

        // Scores
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

        // Tutorials
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

        // Stop timer on unload
        window.addEventListener('beforeunload', () => {
            stopTimer();
        });
    }

    /********************************************************************
     *  Helper / Utility
     ********************************************************************/
    function logGraphDetails(edges) {
        const edgeTable = edges.map(edge => ({
            Vertex1: edge.data.source,
            Vertex2: edge.data.target,
            Weight: edge.data.weight
        }));
        console.log("Kruskal edges:", edgeTable);
    }

    function exportDataForDownload(edgeTable) {
        window.exportData = { table: edgeTable };
    }

    function initializeCytoscape(nodes, edges) {
        // Assign alt for left/right
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
                        'background-opacity': 0,
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

    // Compare objects
    function objectsEqual(a, b) {
        const aKeys = Object.keys(a);
        const bKeys = Object.keys(b);
        if (aKeys.length !== bKeys.length) return false;
        for (let key of aKeys) {
            if (a[key] !== b[key]) return false;
        }
        return true;
    }

    // Compare arrays
    function arraysEqual(arr1, arr2) {
        if (arr1.length !== arr2.length) return false;
        for (let i = 0; i < arr1.length; i++) {
            if (!objectsEqual(arr1[i], arr2[i])) return false;
        }
        return true;
    }

    // Check if a node is still in the MST
    function isNodeInTable(actionHistory, nodeId) {
        return actionHistory.some(a => {
            return a.sourceNode?.id() === nodeId || a.targetNode?.id() === nodeId;
        });
    }

    /********************************************************************
     *  Edge selection & Undo
     ********************************************************************/
    function handleEdgeSelection(evt, cy, actionHistory, actionTableId) {
        const edge = evt.target;
        const existingIndex = actionHistory.findIndex(a => a.edge.id() === edge.id());
        if (existingIndex !== -1) {
            handleUndoAction(cy, actionHistory, actionTableId);
            return;
        }

        edge.style({ width: 4, 'line-color': '#94d95f' });
        const sourceNode = cy.$(`#${edge.data('source')}`);
        const targetNode = cy.$(`#${edge.data('target')}`);

        sourceNode.style({
            'background-color': '#94d95f',
            'background-opacity': 1
        });
        targetNode.style({
            'background-color': '#94d95f',
            'background-opacity': 1
        });

        actionHistory.push({ edge, sourceNode, targetNode });
        updateActionTable(actionHistory, actionTableId);

        const w = parseInt(edge.data('weight'));
        addEdgeWeight(w);
    }

    function handleUndoAction(cy, actionHistory, actionTableId) {
        if (actionHistory.length > 0) {
            const { edge, sourceNode, targetNode } = actionHistory.pop();
            edge.style({ width: 1, 'line-color': '#999' });

            // Check if sourceNode is still used
            if (!isNodeInTable(actionHistory, sourceNode.id())) {
                sourceNode.style({
                    'background-color': '#e9ecef',
                    'background-opacity': 0
                });
            } else {
                sourceNode.style({
                    'background-color': '#94d95f',
                    'background-opacity': 1
                });
            }

            // Check if targetNode is still used
            if (!isNodeInTable(actionHistory, targetNode.id())) {
                targetNode.style({
                    'background-color': '#e9ecef',
                    'background-opacity': 0
                });
            } else {
                targetNode.style({
                    'background-color': '#94d95f',
                    'background-opacity': 1
                });
            }

            updateActionTable(actionHistory, actionTableId);

            const w = parseInt(edge.data('weight'));
            subtractEdgeWeight(w);
        }
    }

    /********************************************************************
     *  1) Screenshot up to mismatch
     ********************************************************************/
    function highlightEdgesAndScreenshot(cy, correctSol, playerSol) {
        const oldStyles = {};

        // Convert edges to canonical string
        function canonical(e) {
            let [a,b] = [e.Vertex1, e.Vertex2];
            if (a > b) [a,b] = [b,a];
            return `${a}-${b}-${e.Weight}`;
        }

        const correctSet = new Set(correctSol.map(canonical));
        const playerSet  = new Set(playerSol.map(canonical));

        // Color edges
        cy.edges().forEach(ed => {
            const edgeId = ed.id();
            oldStyles[edgeId] = {
                width: ed.style('width'),
                lineColor: ed.style('line-color')
            };

            const eObj = {
                Vertex1: parseInt(ed.data('source')),
                Vertex2: parseInt(ed.data('target')),
                Weight: parseInt(ed.data('weight'))
            };
            const str = canonical(eObj);

            if (playerSet.has(str)) {
                if (correctSet.has(str)) {
                    // correct
                    ed.style({ width: 4, 'line-color': '#00b300' });
                } else {
                    // chosen but incorrect
                    ed.style({ width: 4, 'line-color': 'red' });
                }
            } else {
                // not chosen => gray
                ed.style({ width: 1, 'line-color': '#999' });
            }
        });

        // Screenshot
        const dataUrl = cy.png({ bg: 'white' });

        // revert
        cy.edges().forEach(ed => {
            const edgeId = ed.id();
            ed.style({
                width: oldStyles[edgeId].width,
                'line-color': oldStyles[edgeId].lineColor
            });
        });

        return dataUrl;
    }

    /********************************************************************
     *  2) Bilingual Detailed Table
     ********************************************************************/
    function buildDetailedComparisonHTML(lang, correctSol, playerSol) {
        const i18n = {
            en: {
                correctMST: "Indicative solution",
                yourMST: "Your answer",
                start: "Start",
                target: "Target",
                weight: "Weight",
                status: "Status",
                correct: "Correct",
                mistake: "Mistake",
                ok: "OK",
                dash: "—"
            },
            el: {
                correctMST: "Ενδεικτική λύση",
                yourMST: "Η λύση σου",
                start: "Αρχή",
                target: "Στόχος",
                weight: "Βάρος",
                status: "Κατάσταση",
                correct: "Σωστό",
                mistake: "Λάθος",
                ok: "ΟΚ",
                dash: "—"
            }
        };
        const t = (lang === 'en') ? i18n.en : i18n.el;

        const maxLen = Math.max(correctSol.length, playerSol.length);

        let html = `
          <table style="border-collapse: collapse; margin-top:10px;">
            <thead>
              <tr>
                <th colspan="4" style="border:1px solid #ccc;">${t.correctMST}</th>
                <th colspan="4" style="border:1px solid #ccc;">${t.yourMST}</th>
              </tr>
              <tr>
                <th style="padding:4px; border:1px solid #ccc;">${t.start}</th>
                <th style="padding:4px; border:1px solid #ccc;">${t.target}</th>
                <th style="padding:4px; border:1px solid #ccc;">${t.weight}</th>
                <th style="padding:4px; border:1px solid #ccc;">${t.status}</th>

                <th style="padding:4px; border:1px solid #ccc;">${t.start}</th>
                <th style="padding:4px; border:1px solid #ccc;">${t.target}</th>
                <th style="padding:4px; border:1px solid #ccc;">${t.weight}</th>
                <th style="padding:4px; border:1px solid #ccc;">${t.status}</th>
              </tr>
            </thead>
            <tbody>
        `;

        for (let i = 0; i < maxLen; i++) {
            const cEdge = correctSol[i];
            const pEdge = playerSol[i];

            let cStart = cEdge ? cEdge.Vertex1 : t.dash;
            let cTarget= cEdge ? cEdge.Vertex2 : t.dash;
            let cWeight= cEdge ? cEdge.Weight  : t.dash;

            let pStart = pEdge ? pEdge.Vertex1 : t.dash;
            let pTarget= pEdge ? pEdge.Vertex2 : t.dash;
            let pWeight= pEdge ? pEdge.Weight  : t.dash;

            let cStatus = '';
            let pStatus = '';

            // If both edges exist & match => "OK"
            if (cEdge && pEdge &&
                cEdge.Vertex1 === pEdge.Vertex1 &&
                cEdge.Vertex2 === pEdge.Vertex2 &&
                cEdge.Weight  === pEdge.Weight) {
                cStatus = t.ok;
                pStatus = t.ok;
            } else {
                if (cEdge) cStatus = t.correct;
                if (pEdge) pStatus = t.mistake;
            }

            html += `
              <tr>
                <td style="padding:4px; border:1px solid #ccc;">${cStart}</td>
                <td style="padding:4px; border:1px solid #ccc;">${cTarget}</td>
                <td style="padding:4px; border:1px solid #ccc;">${cWeight}</td>
                <td style="padding:4px; border:1px solid #ccc;">${cStatus}</td>

                <td style="padding:4px; border:1px solid #ccc;">${pStart}</td>
                <td style="padding:4px; border:1px solid #ccc;">${pTarget}</td>
                <td style="padding:4px; border:1px solid #ccc;">${pWeight}</td>
                <td style="padding:4px; border:1px solid #ccc;">${pStatus}</td>
              </tr>
            `;
        }

        html += `</tbody></table>`;
        return html;
    }

    /********************************************************************
     *  3) Mismatch Index
     ********************************************************************/
    function findMismatchIndex(playerSol, correctSol) {
        const len = Math.min(playerSol.length, correctSol.length);
        for (let i = 0; i < len; i++) {
            const p = playerSol[i], c = correctSol[i];
            if (
                p.Vertex1 !== c.Vertex1 ||
                p.Vertex2 !== c.Vertex2 ||
                p.Weight  !== c.Weight
            ) {
                return i;
            }
        }
        if (playerSol.length !== correctSol.length) {
            return len;
        }
        return -1;
    }

    /********************************************************************
     *  4) handleSubmitAction => partial screenshot & full table
     ********************************************************************/
    function handleSubmitAction(cy, actionHistory, orderingTables, ids) {
        console.log("handleSubmitAction() for Kruskal is executing!");

        // 1) Build player's full solution
        const playerSolutionFull = actionHistory.map(({ edge }) => {
            let v1 = parseInt(edge.data('source'));
            let v2 = parseInt(edge.data('target'));
            const weight = parseInt(edge.data('weight'));
            if (v1 > v2) [v1, v2] = [v2, v1];
            return { Vertex1: v1, Vertex2: v2, Weight: weight };
        });

        // 2) Find the best matching MST from orderingTables
        let bestOrdering = null;
        let bestScore = -1;

        // measureSimilarity = consecutive matches from the start
        function measureSimilarity(pSol, cSol) {
            const minLen = Math.min(pSol.length, cSol.length);
            let s = 0;
            for (let i = 0; i < minLen; i++) {
                if (pSol[i].Vertex1 === cSol[i].Vertex1 &&
                    pSol[i].Vertex2 === cSol[i].Vertex2 &&
                    pSol[i].Weight === cSol[i].Weight) {
                    s++;
                } else {
                    break;
                }
            }
            return s;
        }

        for (let tableObj of orderingTables) {
            for (let ordering of tableObj.orderings) {
                const sim = measureSimilarity(playerSolutionFull, ordering);
                if (sim > bestScore) {
                    bestScore = sim;
                    bestOrdering = ordering;
                }
            }
        }

        // If fully matched => correct
        const isCorrect = (
            bestOrdering &&
            bestScore === playerSolutionFull.length &&
            playerSolutionFull.length === bestOrdering.length
        );

        // 3) Stop timer, compute score
        stopTimer();
        const totalVertices = cy.nodes().length;
        const totalEdges = cy.edges().length;
        const timeUsed = totalSeconds > 0 ? totalSeconds : 1;
        let score = isCorrect ? Math.floor((totalVertices * totalEdges * 100) / timeUsed) : 0;

        // 4) Show messages
        const lang = localStorage.getItem('language') || 'el';
        const messages = {
            en: {
                correct: "Correct",
                correct2: "Congratulations!",
                incorrect: "Your answer is not correct...",
                incorrect2: "Try again or visit the tutorial...",
                score: "Score:"
            },
            el: {
                correct: "Σωστα!",
                correct2: "Συγχαρητήρια!",
                incorrect: "Η απάντησή σας δεν είναι σωστή...",
                incorrect2: "Προσπαθήστε ξανά ή επισκεφθείτε τον οδηγό παιχνιδιού...",
                score: "Σκορ:"
            }
        };

        const popupMessage = $('#' + ids.popupMessageId);
        popupMessage.text(isCorrect ? messages[lang].correct : messages[lang].incorrect);
        popupMessage.append(`<br>${isCorrect ? messages[lang].correct2 : messages[lang].incorrect2}`);
        popupMessage.append(`<br>${messages[lang].score} ${score}`);
        $('#' + ids.popupId).removeClass('hidden');

        // Clear old results
        const compareDivId = (lang === 'en') ? "#comparison-table-en" : "#comparison-table-el";
        $(compareDivId).empty();

        // 5) Always show screenshot (correct or not)
        // If correct => mismatchIndex = -1 => use full
        // If wrong => partial
        let mismatchIndex = -1;
        if (!isCorrect && bestOrdering) {
            mismatchIndex = findMismatchIndex(playerSolutionFull, bestOrdering);
        }
        const truncatedCorrect = (mismatchIndex >= 0)
            ? bestOrdering.slice(0, mismatchIndex + 1)
            : bestOrdering;
        const truncatedPlayer = (mismatchIndex >= 0)
            ? playerSolutionFull.slice(0, mismatchIndex + 1)
            : playerSolutionFull;

        const screenshotData = highlightEdgesAndScreenshot(cy, truncatedCorrect || [], truncatedPlayer || []);
        $(compareDivId).append(`
        <div style="text-align:center; margin-bottom:10px;">
            <img src="${screenshotData}" 
                 alt="Comparison Graph" 
                 style="max-width:100%; border:1px solid #ccc;" />
        </div>
    `);

        // 6) Only show the full table if user is wrong
        if (!isCorrect && bestOrdering) {
            const fullTable = buildDetailedComparisonHTML(
                lang,
                bestOrdering,
                playerSolutionFull
            );
            $(compareDivId).append(fullTable);
        }

        // 7) If correct => update DB
        if (score > 0) {
            const username = sessionStorage.getItem('username');
            if (username) {
                const method = $('#gameMethod').val(); // "kruskal"
                updatePlayerScore(username, score, method)
                    .then(result => console.log('Score added successfully!', result))
                    .catch(err => console.error('Error adding score:', err));
            }
        }
    }


    // Stop timer on unload
    window.addEventListener('beforeunload', function() {
        stopTimer();
    });
});
