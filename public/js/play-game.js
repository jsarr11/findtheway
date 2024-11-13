document.addEventListener("DOMContentLoaded", function() {
    const svg = d3.select("svg");

    const width = parseInt(svg.style("width"));
    const height = parseInt(svg.style("height"));

    const nodes = d3.range(7).map(i => ({index: i, x: Math.random() * width, y: Math.random() * height}));

    const circle = svg.append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(nodes)
        .enter().append("circle")
        .attr("r", 10)
        .attr("fill", "#69b3a2");

    const simulation = d3.forceSimulation(nodes)
        .force("charge", d3.forceManyBody().strength(-50)) // Further reduced the strength
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide().radius(30)) // Reduced the collision radius
        .on("tick", ticked);

    function ticked() {
        circle
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);
    }
});
