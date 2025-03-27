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
import { updateScores } from '../common/scoreUpdaterPopup.js';

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
            updateScores();
            $("#scores-popup-el").removeClass("hidden");
        });
        $("#close-scores-popup-el").on("click", function() {
            $("#scores-popup-el").addClass("hidden");
        });
        $("#scores-button-en").on("click", function() {
            updateScores();
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
     *  1) Screenshot up to mismatch (or entire if ignoring order)
     ********************************************************************/
    function highlightEdgesAndScreenshot(cy, correctSol, playerSol) {
        const oldStyles = {};

        // Convert edges to canonical string
        function canonical(e) {
            let [a, b] = [e.Vertex1, e.Vertex2];
            if (a > b) [a, b] = [b, a];
            return `${a}-${b}-${e.Weight}`;
        }

        const correctSet = new Set(correctSol.map(canonical));
        const playerSet = new Set(playerSol.map(canonical));

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
    function buildDetailedComparisonHTML(lang, correctSol, playerSol, mismatchIndex = -1) {
        // Bilingual texts
        const i18n = {
            en: {
                correctMST: "Suggested solution",
                yourMST: "Your answer",
                edge: "Pavement",
                weight: "Cost",
                status: "Status",
                correct: "Correct",
                mistake: "Mistake",
                ok: "OK",
                dash: "—"
            },
            el: {
                correctMST: "Προτεινόμενη λύση",
                yourMST: "Η λύση σου",
                edge: "Πεζοδρόμιο",
                weight: "Κόστος",
                status: "Κατάσταση",
                correct: "Σωστό",
                mistake: "Λάθος",
                ok: "ΟΚ",
                dash: "—"
            }
        };
        const t = (lang === 'en') ? i18n.en : i18n.el;
        const maxLen = Math.max(correctSol.length, playerSol.length);

        let correctRows = "";
        for (let i = 0; i < maxLen; i++) {
            const cEdge = correctSol[i];
            let edgeText, weightText;
            if (cEdge) {
                edgeText = `${cEdge.Vertex1}-${cEdge.Vertex2}`;
                weightText = cEdge.Weight;
            } else {
                edgeText = t.dash;
                weightText = t.dash;
            }
            // Highlight row if mismatch index
            const rowStyle = (i === mismatchIndex && mismatchIndex !== -1) ? 'background-color: #fdd;' : '';
            correctRows += `
          <tr style="${rowStyle}">
            <td style="padding:4px; border:1px solid #ccc;">${edgeText}</td>
            <td style="padding:4px; border:1px solid #ccc;">${weightText}</td>
          </tr>
        `;
        }
        const correctTable = `
      <h3 style="margin:0 0 4px 0;">${t.correctMST}</h3>
      <table style="font-size:0.9rem; border-collapse:collapse; width:100%; margin-top:0;">
        <thead>
          <tr>
            <th style="padding:4px; border:1px solid #ccc;">${t.edge}</th>
            <th style="padding:4px; border:1px solid #ccc;">${t.weight}</th>
          </tr>
        </thead>
        <tbody>
          ${correctRows}
        </tbody>
      </table>
    `;

        let playerRows = "";
        for (let i = 0; i < maxLen; i++) {
            const pEdge = playerSol[i];
            let edgeText, weightText, statusText = "";
            if (pEdge) {
                edgeText = `${pEdge.Vertex1}-${pEdge.Vertex2}`;
                weightText = pEdge.Weight;
            } else {
                edgeText = t.dash;
                weightText = t.dash;
            }
            // If both edges exist & match exactly in same index => OK, else Mistake
            if (pEdge && correctSol[i] &&
                pEdge.Vertex1 === correctSol[i].Vertex1 &&
                pEdge.Vertex2 === correctSol[i].Vertex2 &&
                pEdge.Weight === correctSol[i].Weight) {
                statusText = t.ok;
            } else if (pEdge) {
                statusText = t.mistake;
            } else {
                statusText = t.dash;
            }
            const rowStyle = (i === mismatchIndex && mismatchIndex !== -1) ? 'background-color: #fdd;' : '';
            playerRows += `
          <tr style="${rowStyle}">
            <td style="padding:4px; border:1px solid #ccc;">${edgeText}</td>
            <td style="padding:4px; border:1px solid #ccc;">${weightText}</td>
            <td style="padding:4px; border:1px solid #ccc;">${statusText}</td>
          </tr>
        `;
        }
        const playerTable = `
      <h3 style="margin:0 0 4px 0;">${t.yourMST}</h3>
      <table style="font-size:0.9rem; border-collapse:collapse; width:100%; margin-top:0;">
        <thead>
          <tr>
            <th style="padding:4px; border:1px solid #ccc;">${t.edge}</th>
            <th style="padding:4px; border:1px solid #ccc;">${t.weight}</th>
            <th style="padding:4px; border:1px solid #ccc;">${t.status}</th>
          </tr>
        </thead>
        <tbody>
          ${playerRows}
        </tbody>
      </table>
    `;

        return `
      <div style="display:flex; gap:1rem; margin-top:10px; justify-content:center; align-items:flex-start;">
        <div style="width:auto; margin-top:0;">${correctTable}</div>
        <div style="width:auto; margin-top:0;">${playerTable}</div>
      </div>
    `;
    }

    /********************************************************************
     *  2a) Build table ignoring order (to show all edges as OK
     *      if the set is correct but the sequence is different)
     ********************************************************************/
    function buildDetailedComparisonHTMLIgnoreOrder(lang, correctSol, playerSol) {
        // Same i18n as above
        const i18n = {
            en: {
                correctMST: "Suggested solution",
                yourMST: "Your answer",
                edge: "Pavement",
                weight: "Cost",
                status: "Status",
                correct: "Correct",
                mistake: "Mistake",
                ok: "OK",
                dash: "—"
            },
            el: {
                correctMST: "Προτεινόμενη λύση",
                yourMST: "Η λύση σου",
                edge: "Πεζοδρόμιο",
                weight: "Κόστος",
                status: "Κατάσταση",
                correct: "Σωστό",
                mistake: "Λάθος",
                ok: "ΟΚ",
                dash: "—"
            }
        };
        const t = (lang === 'en') ? i18n.en : i18n.el;

        // We'll show them side by side but mark everything in the player's MST as OK
        // if it appears anywhere in the correct set.
        const correctLen = correctSol.length;
        const playerLen = playerSol.length;
        const maxLen = Math.max(correctLen, playerLen);

        // For fast membership checking
        function canonical(e) {
            let [a, b] = [e.Vertex1, e.Vertex2];
            if (a > b) [a, b] = [b, a];
            return `${a}-${b}-${e.Weight}`;
        }
        const correctSet = new Set(correctSol.map(canonical));

        // Build correct table
        let correctRows = "";
        for (let i = 0; i < correctLen; i++) {
            const cEdge = correctSol[i];
            const edgeText = `${cEdge.Vertex1}-${cEdge.Vertex2}`;
            correctRows += `
              <tr>
                <td style="padding:4px; border:1px solid #ccc;">${edgeText}</td>
                <td style="padding:4px; border:1px solid #ccc;">${cEdge.Weight}</td>
              </tr>
            `;
        }
        const correctTable = `
        <h3 style="margin:0 0 4px 0;">${t.correctMST}</h3>
        <table style="font-size:0.9rem; border-collapse:collapse; width:100%; margin-top:0;">
          <thead>
            <tr>
              <th style="padding:4px; border:1px solid #ccc;">${t.edge}</th>
              <th style="padding:4px; border:1px solid #ccc;">${t.weight}</th>
            </tr>
          </thead>
          <tbody>
            ${correctRows}
          </tbody>
        </table>
        `;

        // Build player table
        let playerRows = "";
        for (let i = 0; i < playerLen; i++) {
            const pEdge = playerSol[i];
            const edgeText = `${pEdge.Vertex1}-${pEdge.Vertex2}`;
            const isInCorrectSet = correctSet.has(canonical(pEdge));
            const statusText = isInCorrectSet ? t.ok : t.mistake;
            playerRows += `
              <tr>
                <td style="padding:4px; border:1px solid #ccc;">${edgeText}</td>
                <td style="padding:4px; border:1px solid #ccc;">${pEdge.Weight}</td>
                <td style="padding:4px; border:1px solid #ccc;">${statusText}</td>
              </tr>
            `;
        }
        const playerTable = `
        <h3 style="margin:0 0 4px 0;">${t.yourMST}</h3>
        <table style="font-size:0.9rem; border-collapse:collapse; width:100%; margin-top:0;">
          <thead>
            <tr>
              <th style="padding:4px; border:1px solid #ccc;">${t.edge}</th>
              <th style="padding:4px; border:1px solid #ccc;">${t.weight}</th>
              <th style="padding:4px; border:1px solid #ccc;">${t.status}</th>
            </tr>
          </thead>
          <tbody>
            ${playerRows}
          </tbody>
        </table>
        `;

        return `
        <div style="display:flex; gap:1rem; margin-top:10px; justify-content:center; align-items:flex-start;">
          <div style="width:auto; margin-top:0;">${correctTable}</div>
          <div style="width:auto; margin-top:0;">${playerTable}</div>
        </div>
      `;
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
                p.Weight !== c.Weight
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
     *  Utility to check if two sets of edges match ignoring order
     ********************************************************************/
    function sameEdgeSetsIgnoreOrder(pSol, cSol) {
        if (pSol.length !== cSol.length) return false;
        // Convert to canonical forms and compare sets
        function canonical(e) {
            let [a, b] = [e.Vertex1, e.Vertex2];
            if (a > b) [a, b] = [b, a];
            return `${a}-${b}-${e.Weight}`;
        }
        const setP = new Set(pSol.map(canonical));
        const setC = new Set(cSol.map(canonical));
        if (setP.size !== setC.size) return false;
        for (let item of setP) {
            if (!setC.has(item)) return false;
        }
        return true;
    }

    /********************************************************************
     *  4) handleSubmitAction => partial screenshot & full table
     ********************************************************************/
    function handleSubmitAction(cy, actionHistory, orderingTables, ids) {
        console.log("handleSubmitAction() for Kruskal is executing!");

        // 1) Build player's MST as a set of edges (ignoring order).
        const playerSolutionFull = actionHistory.map(({ edge }) => {
            let v1 = parseInt(edge.data('source'));
            let v2 = parseInt(edge.data('target'));
            const weight = parseInt(edge.data('weight'));
            if (v1 > v2) [v1, v2] = [v2, v1];
            return { Vertex1: v1, Vertex2: v2, Weight: weight };
        });

        // 2) For comparing sets, we define a function that checks if
        //    player's MST matches a correct MST ignoring order.
        function canonical(e) {
            let [a, b] = [e.Vertex1, e.Vertex2];
            if (a > b) [a, b] = [b, a];
            return `${a}-${b}-${e.Weight}`;
        }
        function setsMatchIgnoreOrder(pSol, cSol) {
            if (pSol.length !== cSol.length) return false;
            const setP = new Set(pSol.map(canonical));
            const setC = new Set(cSol.map(canonical));
            if (setP.size !== setC.size) return false;
            for (let item of setP) {
                if (!setC.has(item)) return false;
            }
            return true;
        }

        // 3) Find at least one correct MST in orderingTables that *ignoring order*
        //    matches the player’s MST. If so, player is correct.
        let isCorrect = false;
        let matchedCorrectMST = null;
        for (let tableObj of orderingTables) {
            for (let ordering of tableObj.orderings) {
                if (setsMatchIgnoreOrder(playerSolutionFull, ordering)) {
                    isCorrect = true;
                    matchedCorrectMST = ordering;
                    break;
                }
            }
            if (isCorrect) break;
        }

        // 4) Stop timer & compute score if correct
        stopTimer();
        const totalVertices = cy.nodes().length;
        const totalEdges = cy.edges().length;
        const timeUsed = totalSeconds > 0 ? totalSeconds : 1;
        const score = isCorrect ? Math.floor((totalVertices * totalEdges * 100) / timeUsed) : 0;

        // 5) Show messages (we do NOT remove or change your existing text)
        const lang = localStorage.getItem('language') || 'el';
        const messages = {
            en: {
                correct: "Correct",
                correct2: "Congratulations!",
                incorrect: "Suggestion incorrect...",
                incorrect2: "Try again or recall 'How to play'",
                score: "Score:",
                orderNote: "Order is ignored in this comparison."
            },
            el: {
                correct: "Σωστά!",
                correct2: "Συγχαρητήρια!",
                incorrect: "Η απάντησή δεν είναι σωστή...",
                incorrect2: "Προσπαθήστε ξανά ή ξαναδείτε 'Πώς να παίξετε'",
                score: "Βαθμολογία:",
                orderNote: "Η σειρά δεν λαμβάνεται υπόψη σε αυτή τη σύγκριση."
            }
        };

        const popupMessage = $('#' + ids.popupMessageId);
        popupMessage.text(isCorrect ? messages[lang].correct : messages[lang].incorrect);
        popupMessage.append(`<br>${isCorrect ? messages[lang].correct2 : messages[lang].incorrect2}`);
        popupMessage.append(`<br>${messages[lang].score} ${score}`);
        $('#' + ids.popupId).removeClass('hidden');

        // 6) Prepare the screenshot. We highlight edges ignoring order.
        //    In highlightEdgesAndScreenshot(), green means edge is in both
        //    sets, red means it’s only in the player’s set, grey means unchosen.
        //    We pass the entire sets, no partial mismatch or indexing.
        const compareDivId = (lang === 'en') ? "#comparison-table-en" : "#comparison-table-el";
        $(compareDivId).empty();

        // If correct, matchedCorrectMST is the MST to compare with; else pick any MST from orderingTables (first found),
        // or just an empty array if none. This ensures we highlight "extra / missing" edges ignoring order.
        let chosenMST = matchedCorrectMST;
        if (!isCorrect) {
            // fallback: pick the first MST from orderingTables if any
            if (orderingTables.length > 0 && orderingTables[0].orderings.length > 0) {
                chosenMST = orderingTables[0].orderings[0];
            } else {
                chosenMST = [];
            }
        }

        const screenshotData = highlightEdgesAndScreenshot(cy, chosenMST, playerSolutionFull);
        $(compareDivId).append(`
        <div class="screenshot">
            <img src="${screenshotData}"
                 alt="Comparison Graph"
                 style="max-width:100%; border:1px solid #ccc;" />
        </div>
    `);

        // 7) Build a table ignoring order for the final comparison
        //    This labels each player edge as "OK" or "Mistake" based purely on set membership.
        //    Similarly, it shows the correct MST's edges, no partial indexing.
        const tableHTML = buildDetailedComparisonHTMLIgnoreOrder(lang, chosenMST, playerSolutionFull);
        $(compareDivId).append(tableHTML);

        // 8) Always show an orange note that we ignore order
        $(compareDivId).append(`
      <div style="margin-top:10px; padding:8px; background-color:orange;">
        ${messages[lang].orderNote}
      </div>
    `);

        // 9) If correct => update DB
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
