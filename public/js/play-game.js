document.addEventListener("DOMContentLoaded", function() {
    const svg = d3.select("svg");

    const width = parseInt(svg.style("width"));
    const height = parseInt(svg.style("height"));

    const nodes = d3.range(7).map(i => ({index: i, x: Math.random() * width, y: Math.random() * height}));
    const edges = [];

    // Ensure the graph is connected
    for (let i = 1; i < nodes.length; i++) {
        edges.push({source: nodes[i-1], target: nodes[i]});
    }

    // Add additional edges to make a total of 12 edges
    while (edges.length < 12) {
        const source = nodes[Math.floor(Math.random() * nodes.length)];
        const target = nodes[Math.floor(Math.random() * nodes.length)];

        if (source !== target && !edges.some(edge => (edge.source === source && edge.target === target) || (edge.source === target && edge.target === source))) {
            edges.push({source, target});
        }
    }

    const link = svg.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(edges)
        .enter().append("line")
        .attr("stroke-width", 2)
        .attr("stroke", "#999");

    const circle = svg.append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(nodes)
        .enter().append("circle")
        .attr("r", 10)
        .attr("fill", "#69b3a2");

    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(edges).distance(300).strength(1)) // Adjusted link distance
        .force("charge", d3.forceManyBody().strength(-150)) // Adjusted charge force
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide().radius(90)) // Increased collision radius
        .on("tick", ticked);

    function ticked() {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        circle
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);
    }
});
