document.addEventListener("DOMContentLoaded", function() {
    const nodes = [];
    for (let i = 0; i < 7; i++) {
        nodes.push({ data: { id: (i + 1).toString() } });
    }

    const edges = [];
    for (let i = 1; i < nodes.length; i++) {
        edges.push({ data: { source: (i).toString(), target: (i + 1).toString(), weight: Math.floor(Math.random() * 16) + 5 } });
    }

    while (edges.length < 10) {
        const source = (Math.floor(Math.random() * nodes.length) + 1).toString();
        const target = (Math.floor(Math.random() * nodes.length) + 1).toString();
        if (source !== target && !edges.some(edge => (edge.data.source === source && edge.data.target === target) || (edge.data.source === target && edge.data.target === source))) {
            edges.push({ data: { source, target, weight: Math.floor(Math.random() * 16) + 5 } });
        }
    }

    const cy = cytoscape({
        container: document.getElementById('cy'),
        elements: {
            nodes: nodes,
            edges: edges
        },
        style: [
            {
                selector: 'node',
                style: {
                    'background-color': '#69b3a2',
                    'label': 'data(id)',
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'color': '#ffffff',
                    'width': '15px',
                    'height': '15px',
                    'font-size': '8px'
                }
            },
            {
                selector: 'edge',
                style: {
                    'width': 1,
                    'line-color': '#999',
                    'label': 'data(weight)',
                    'text-margin-y': -5, // Further offset the label vertically
                    'color': '#000000',
                    'font-size': '4px', // Adjust the font size
                    'text-wrap': 'wrap', // Ensure the text wraps if needed
                    'text-rotation': 'none' // Ensure the text is horizontal
                }
            }
        ],
        layout: {
            name: 'cose',
            padding: 10
        }
    });

    // Adjust label positions to avoid overlapping when edges cross
    cy.ready(function() {
        cy.elements('edge').forEach(function(edge) {
            const label = edge.data('weight');
            edge.data('label', label);
        });

        // Bring edges to the front
        cy.elements('edge').move({ parent: null });
    });
});
