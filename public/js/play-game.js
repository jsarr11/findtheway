document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded and parsed');
    generateRandomGraph(5, 7); // Example: 5 vertices, 7 edges
});

let selectedEdges = [];

function generateRandomGraph(vertices, edges) {
    console.log('Generating random graph');
    const graphContainer = document.getElementById('graph-container');
    graphContainer.innerHTML = ''; // Clear previous graph

    let graph = createGraph(vertices, edges);
    console.log('Graph generated:', graph);

    const svg = d3.select("#graph-container").append("svg")
        .attr("width", graphContainer.clientWidth)
        .attr("height", graphContainer.clientHeight);

    const link = svg.selectAll(".link")
        .data(graph.edges)
        .enter().append("line")
        .attr("class", "link")
        .style("stroke", "#ccc")
        .style("stroke-width", 2)
        .on("click", selectEdge);

    const linkText = svg.selectAll(".linkText")
        .data(graph.edges)
        .enter().append("text")
        .attr("class", "linkText")
        .attr("dy", -3)
        .text(d => d.weight);

    const node = svg.selectAll(".node")
        .data(graph.vertices)
        .enter().append("circle")
        .attr("class", "node")
        .attr("r", 10)
        .style("fill", "#007bff")
        .style("stroke", "#fff")
        .style("stroke-width", 1.5);

    const nodeText = svg.selectAll(".nodeText")
        .data(graph.vertices)
        .enter().append("text")
        .attr("class", "nodeText")
        .attr("dy", -12)
        .style("font-weight", "bold") // Make vertex numbers bold
        .text(d => d.index);

    const simulation = d3.forceSimulation()
        .nodes(graph.vertices)
        .force("link", d3.forceLink(graph.edges).id(d => d.index).distance(100))
        .force("charge", d3.forceManyBody().strength(-300))
        .force("center", d3.forceCenter(graphContainer.clientWidth / 2, graphContainer.clientHeight / 2))
        .on("tick", ticked);

    function ticked() {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        linkText
            .attr("x", d => (d.source.x + d.target.x) / 2)
            .attr("y", d => (d.source.y + d.target.y) / 2);

        node
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);

        nodeText
            .attr("x", d => d.x)
            .attr("y", d => d.y);
    }

    function selectEdge(event, edge) {
        selectedEdges.push(edge);
        displayMessage(`Selected edge: (${edge.source.index}, ${edge.target.index}) - Weight: ${edge.weight}`);
        d3.select(this).style("stroke", "#007bff").style("stroke-width", 4);
    }
}

function createGraph(vertices, edges) {
    let graph = { vertices: [], edges: [] };
    let allVerticesConnected = new Set();
    let edgeSet = new Set();

    for (let i = 0; i < vertices; i++) {
        graph.vertices.push({ index: i });
    }

    while (allVerticesConnected.size < vertices) {
        let u = Math.floor(Math.random() * vertices);
        let v = Math.floor(Math.random() * vertices);
        let weight = Math.floor(Math.random() * 100) + 1; // Random weight between 1 and 100
        let edge = `${u}-${v}`;
        if (u !== v && !edgeSet.has(edge) && !edgeSet.has(`${v}-${u}`)) {
            graph.edges.push({ source: u, target: v, weight: weight });
            allVerticesConnected.add(u);
            allVerticesConnected.add(v);
            edgeSet.add(edge);
        }
    }

    for (let i = graph.edges.length; i < edges; i++) {
        let u = Math.floor(Math.random() * vertices);
        let v = Math.floor(Math.random() * vertices);
        let weight = Math.floor(Math.random() * 100) + 1; // Random weight between 1 and 100
        let edge = `${u}-${v}`;
        if (u !== v && !edgeSet.has(edge) && !edgeSet.has(`${v}-${u}`)) {
            graph.edges.push({ source: u, target: v, weight: weight });
            edgeSet.add(edge);
        }
    }

    console.log('Final graph:', graph);
    return graph;
}

function undoSelection() {
    selectedEdges.pop();
    displayMessage('Last selection undone.');
}

function submitSelection() {
    displayMessage('Selection submitted!');
    // Further processing can be added here
}

function displayMessage(message) {
    const messageDiv = document.getElementById('message');
    messageDiv.innerHTML = message;
}
