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
import { setOrderMessage } from '../common/common.js';

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
            $('#game-message-en, #game-message-el').remove();

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
        const currentLanguage = localStorage.getItem('language') || 'el';

        if (currentLanguage === 'en') {
            const edgeTable = edges.map(edge => ({
                "starting house": edge.data.source,
                "target house": edge.data.target,
                "cost": edge.data.weight
            }));
            console.log("Edges with Cost (Kruskal):");
            console.table(edgeTable);

        } else {
            // Greek version
            const edgeTable = edges.map(edge => ({
                "αρχικό σπίτι": edge.data.source,
                "επόμενο σπίτι": edge.data.target,
                "κόστος": edge.data.weight
            }));
            console.log("Πεζοδρόμια με Κόστος (Kruskal):");
            console.table(edgeTable);
        }
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
    /************************************************************************
     * handleEdgeSelection(...) => Called whenever the user clicks on an edge.
     *    - If the edge is already chosen, it undoes it.
     *    - Otherwise, it checks for a cycle. If cycle => don't pick; show message.
     *    - If valid, picks the edge & checks if there's a smaller edge available.
     *    - Messages appear under the action table in bilingual format
     ************************************************************************/
    function handleEdgeSelection(evt, cy, actionHistory, actionTableId) {
        // 1) Bilingual messages
        const lang = localStorage.getItem('language') || 'el';
        const messages = {
            en: {
                cycle: "This pavement creates a cycle and cannot be selected!",
                smaller: "There is a pavement edge with lower cost available!."
            },
            el: {
                cycle: "Αυτό το πεζοδρόμιο δημιουργεί κύκλο και δεν μπορεί να επιλεγεί!",
                smaller: "Υπάρχει διαθέσιμο πεζοδρόμιο με μικρότερο κόστος!"
            }
        };
        const cycleMsg = (lang === 'en') ? messages.en.cycle : messages.el.cycle;
        const smallerMsg = (lang === 'en') ? messages.en.smaller : messages.el.smaller;

        // 2) Helper to show or clear a text message under the action table
        function showGameMessage(msg) {
            const containerId = (lang === 'en') ? 'game-message-en' : 'game-message-el';
            let container = document.getElementById(containerId);
            if (!container) {
                // create a <div> for messages if none found
                container = document.createElement('div');
                container.id = containerId;
                container.style.color = 'red';
                container.style.margin = '6px 0';
                // place under the appropriate action table
                const tableId = (lang === 'en') ? 'action-table-en' : 'action-table-el';
                const tableElem = document.getElementById(tableId);
                if (tableElem && tableElem.parentNode) {
                    tableElem.parentNode.insertBefore(container, tableElem.nextSibling);
                }
            }
            container.textContent = msg; // if msg=='' => effectively hides it
        }

        // 3) Because the user wants the message to disappear every time they pick ANY edge,
        //    we clear the message immediately at the start of the function.
        //    If there's a cycle or smaller-edge warning, we'll overwrite it below.
        showGameMessage('');

        // 4) Build a union-find from edges in actionHistory
        function buildUnionFind() {
            const parent = {};
            const rank = {};

            actionHistory.forEach(({ edge }) => {
                const s = edge.data('source');
                const t = edge.data('target');
                if (parent[s] === undefined) { parent[s] = s; rank[s] = 0; }
                if (parent[t] === undefined) { parent[t] = t; rank[t] = 0; }
            });

            function find(x) {
                if (parent[x] !== x) {
                    parent[x] = find(parent[x]);
                }
                return parent[x];
            }
            function union(a, b) {
                const ra = find(a);
                const rb = find(b);
                if (ra === rb) return false;
                if (rank[ra] < rank[rb]) {
                    parent[ra] = rb;
                } else if (rank[ra] > rank[rb]) {
                    parent[rb] = ra;
                } else {
                    parent[rb] = ra;
                    rank[ra]++;
                }
                return true;
            }

            // union existing edges
            actionHistory.forEach(({ edge }) => {
                union(edge.data('source'), edge.data('target'));
            });

            return { find, union, parent, rank };
        }

        function formsCycle(edgeToAdd) {
            const uf = buildUnionFind();
            const s = edgeToAdd.data('source');
            const t = edgeToAdd.data('target');
            if (uf.parent[s] === undefined) {
                uf.parent[s] = s; uf.rank[s] = 0;
            }
            if (uf.parent[t] === undefined) {
                uf.parent[t] = t; uf.rank[t] = 0;
            }
            const rs = uf.find(s);
            const rt = uf.find(t);
            return (rs === rt); // same root => cycle
        }

        // --- Original flow
        const edge = evt.target;
        const existingIndex = actionHistory.findIndex(a => a.edge.id() === edge.id());
        if (existingIndex !== -1) {
            // Edge was already chosen => user toggles off
            handleUndoAction(cy, actionHistory, actionTableId);
            return;
        }

        // check cycle
        if (formsCycle(edge)) {
            // revert style
            edge.style({ width: 1, 'line-color': '#999' });
            showGameMessage(cycleMsg);
            return;
        }

        // pick the edge (no cycle)
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

        // check if there's a smaller unpicked edge that wouldn't form a cycle
        const allEdges = cy.edges();
        for (let i = 0; i < allEdges.length; i++) {
            const e = allEdges[i];
            // skip chosen edges
            if (actionHistory.some(a => a.edge.id() === e.id())) continue;
            const ew = parseInt(e.data('weight'));
            if (ew < w && !formsCycle(e)) {
                // show smaller-edge message
                showGameMessage(smallerMsg);
                return; // show only once
            }
        }

        // if none found => no message
        showGameMessage('');
    }


    /************************************************************************
     * handleUndoAction(...) => Also clear the message so it's removed
     * when the user undoes an edge.
     ************************************************************************/

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
        setOrderMessage();

        // 1) Build player's MST ignoring order for correctness,
        //    but we keep the actual sequence for checking tie-based ordering
        const playerSolutionFull = actionHistory.map(({ edge }) => {
            let v1 = parseInt(edge.data('source'));
            let v2 = parseInt(edge.data('target'));
            const weight = parseInt(edge.data('weight'));
            if (v1 > v2) [v1, v2] = [v2, v1];
            return { Vertex1: v1, Vertex2: v2, Weight: weight };
        });

        // Helper to produce a "canonical" string for set membership
        function canonical(e) {
            let [a, b] = [e.Vertex1, e.Vertex2];
            if (a > b) [a, b] = [b, a];
            return `${a}-${b}-${e.Weight}`;
        }

        // 2) Check if two MSTs match ignoring order (just sets)
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

        // 3) **Tie‐Aware** sequence check:
        //    The idea is to group edges by their weight, in ascending order,
        //    and allow any permutation of edges within the same weight group.
        //    If those grouped sequences match, we consider them "same order ignoring ties."
        function sameSequenceIgnoringTies(playerSol, officialSol) {
            // Quick length check
            if (playerSol.length !== officialSol.length) return false;

            // Sort each MST by ascending weight, but keep the original ordering *within* same weights
            // Actually we want to reflect the *player's chosen order* vs. the official MST order.
            // So we can't just sort them. We must group them in the order they appear.
            //   However, typically in Kruskal we talk about ascending weights.
            //   If the official MST has edges in ascending order, the player’s MST also
            //   can have the same ascending order for each weight group, but can permute within that group.

            // Approach:
            //  1) We create a "weight block sequence" for each MST:
            //     in officialSol, we collect consecutive edges of the same weight as one block.
            //     in playerSol, we do the same.
            //  2) We compare block by block. If the weight is the same and the sets of edges are identical,
            //     we consider that block matched. Then we proceed to the next block.
            //  3) If the number of blocks or their distinct weights differ in the final
            //     sequence, it's not the same ignoring ties.

            // A convenient way is to "collapse" consecutive edges of the same weight into a single block.
            // But we must ensure both MSTs follow the same ascending weight progression.
            // If the official MST is in ascending order already, we can find its blocks.
            // The player's MST might not strictly be sorted, but for it to match ignoring ties,
            // it must have the same "blocks" in the same order of weights.

            // Let's do it directly:

            function buildBlocks(edges) {
                // We'll go in ascending order of weight from left to right.
                // But the "official MST" is presumably listed in ascending order.
                // If it's not guaranteed, we can just sort by weight, but then we lose the original "tie order."
                // The requirement says "the official MST is in ascending weight (Kruskal style)."
                // so let's assume officialSol is sorted. If you want to absolutely ensure it, you can do:
                // edges = [...edges].sort((a,b) => a.Weight - b.Weight);
                // But let's do it for both to be safe:

                const sorted = [...edges].sort((a, b) => a.Weight - b.Weight);
                const blocks = [];
                let currentWeight = null;
                let currentBlock = [];

                for (let i = 0; i < sorted.length; i++) {
                    let e = sorted[i];
                    if (currentWeight === null || e.Weight !== currentWeight) {
                        // start a new block
                        if (currentBlock.length > 0) {
                            blocks.push({ weight: currentWeight, edges: currentBlock });
                        }
                        currentWeight = e.Weight;
                        currentBlock = [ e ];
                    } else {
                        // same weight => part of same block
                        currentBlock.push(e);
                    }
                }
                // push last block
                if (currentBlock.length > 0) {
                    blocks.push({ weight: currentWeight, edges: currentBlock });
                }
                return blocks;
            }

            const blocksP = buildBlocks(playerSol);
            const blocksO = buildBlocks(officialSol);

            if (blocksP.length !== blocksO.length) return false;

            // Now compare block-by-block
            for (let i = 0; i < blocksP.length; i++) {
                const bp = blocksP[i];
                const bo = blocksO[i];
                // Compare weights
                if (bp.weight !== bo.weight) return false;
                // Compare sets of edges in the block
                if (bp.edges.length !== bo.edges.length) return false;

                const setBp = new Set(bp.edges.map(canonical));
                const setBo = new Set(bo.edges.map(canonical));
                // same set ignoring order
                if (setBp.size !== setBo.size) return false;
                for (let x of setBp) {
                    if (!setBo.has(x)) return false;
                }
            }
            return true;
        }

        // 4) Find if the player's MST is correct ignoring order, and if so,
        //    whether it's also "tie‐aware" same sequence
        let isCorrect = false;            // user MST is correct ignoring order
        let matchedCorrectMST = null;     // the official MST that matches ignoring order
        let isTieAwareOrder = false;      // user MST matches the official MST in the sense of ignoring ties
                                          // but still in the same ascending weight block sequence

        // find a matching MST ignoring order
        outerLoop:
            for (let tableObj of orderingTables) {
                for (let officialSol of tableObj.orderings) {
                    if (setsMatchIgnoreOrder(playerSolutionFull, officialSol)) {
                        isCorrect = true;
                        matchedCorrectMST = officialSol;
                        // Now check tie‐aware sequence
                        if (sameSequenceIgnoringTies(playerSolutionFull, officialSol)) {
                            isTieAwareOrder = true;
                        }
                        break outerLoop;
                    }
                }
            }

        // 5) Stop timer & compute score
        stopTimer();
        const totalVertices = cy.nodes().length;
        const totalEdges = cy.edges().length;
        const timeUsed = totalSeconds > 0 ? totalSeconds : 1;
        const score = isCorrect ? Math.floor((totalVertices * totalEdges * 100) / timeUsed) : 0;

        // 6) Bilingual messages
        const lang = localStorage.getItem('language') || 'el';
        const messages = {
            en: {
                correct: "Correct",
                correct2: "Congratulations!",
                incorrect: "Suggestion incorrect...",
                incorrect2: "Try again or recall 'How to play'",
                score: "Score:",
                orderNote: "The order of your picked pavements could be better!"
            },
            el: {
                correct: "Σωστά!",
                correct2: "Συγχαρητήρια!",
                incorrect: "Η απάντησή δεν είναι σωστή...",
                incorrect2: "Προσπαθήστε ξανά ή ξαναδείτε 'Πώς να παίξετε'",
                score: "Βαθμολογία:",
                orderNote: "Υπάρχει καλύτερη σειρά επιλογής ποζοδρομίων!"
            }
        };

        // show result text
        const popupMessage = $('#' + ids.popupMessageId);
        popupMessage.text(isCorrect ? messages[lang].correct : messages[lang].incorrect);
        popupMessage.append(`<br>${isCorrect ? messages[lang].correct2 : messages[lang].incorrect2}`);
        popupMessage.append(`<br>${messages[lang].score} ${score}`);
        $('#' + ids.popupId).removeClass('hidden');

        // 7) Clear the comparison area
        const compareDivId = (lang === 'en') ? "#comparison-table-en" : "#comparison-table-el";
        $(compareDivId).empty();

        // pick an MST to compare for the screenshot
        let chosenMST = matchedCorrectMST;
        if (!isCorrect) {
            // fallback if user is wrong
            if (orderingTables.length > 0 && orderingTables[0].orderings.length > 0) {
                chosenMST = orderingTables[0].orderings[0];
            } else {
                chosenMST = [];
            }
        }

        // screenshot ignoring order
        const screenshotData = highlightEdgesAndScreenshot(cy, chosenMST, playerSolutionFull);
        $(compareDivId).append(`
        <div class="screenshot">
            <img src="${screenshotData}"
                 alt="Comparison Graph"
                 style="max-width:100%; border:1px solid #ccc;" />
        </div>
    `);

        // 8) Build a table ignoring order
        const tableHTML = buildDetailedComparisonHTMLIgnoreOrder(lang, chosenMST, playerSolutionFull);
        $(compareDivId).append(tableHTML);

        // 9) Show the orange message **only** if MST is correct but the user’s sequence
        //    truly differs on differently weighted edges => (isCorrect && !isTieAwareOrder).
        //    If the MST is wrong, or user matched the official MST exactly (including tie permutations),
        //    we skip the orange block.
        if (isCorrect && !isTieAwareOrder) {
            $(compareDivId).append(`
          <div style="margin-top:10px; padding:8px; background-color:orange;">
            ${messages[lang].orderNote}
          </div>
        `);
        }

        // 10) If correct => store DB
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
