export function isEdgeInTable(actionHistory, edgeId) {
    return actionHistory.some(({ edge }) => edge.id() === edgeId);
}

export function isNodeInTable(actionHistory, nodeId) {
    return actionHistory.some(({ sourceNode, targetNode }) => sourceNode.id() === nodeId || targetNode.id() === nodeId);
}

// Function to log adjacency matrix
export function logAdjacencyMatrix(adjacencyMatrix) {
    console.log("Adjacency Matrix:");
    adjacencyMatrix.forEach(row => console.log(row.join(' ')));
}

// Function to normalize edges
export function normalizeEdges(edges) {
    return edges.map(edge =>
        edge.Vertex1 < edge.Vertex2
            ? edge
            : { Vertex1: edge.Vertex2, Vertex2: edge.Vertex1, Weight: edge.Weight }
    ).sort((a, b) => a.Vertex1 - b.Vertex1 || a.Vertex2 - b.Vertex2);
}

export function setOrderMessage() {
    const currentLanguage = localStorage.getItem('language');

    // Define the message in each language
    const messageEn = "You can also see from the tables above if your pavements order could be better. You can try again!";
    const messageEl = "Στους παραπάνω πίνακες μπορείτε να δείτε επίσης αν θα μπορούσατε να επιλέξετε τα πεζοδρόμια με καλύτερη σειρά. Μπορείτε να ξαναδοκιμάσετε!";

    let textEn = "";
    let textEl = "";

    if (currentLanguage === 'en') {
        // English is active, so fill the #order-en message
        textEn = `<p>${messageEn}</p>`;
        // #order-el will be blank
    } else if (currentLanguage === 'el') {
        // Greek is active, so fill #order-el message
        textEl = `<p>${messageEl}</p>`;
        // #order-en will be blank
    } else {
        // If some other language code => default to Greek
        textEl = `<p>${messageEl}</p>`;
    }

    // Now fill the corresponding divs
    const orderDivEn = document.getElementById("order-en");
    const orderDivEl = document.getElementById("order-el");

    if (orderDivEn) {
        orderDivEn.innerHTML = textEn; // either the English paragraph or ""
    }
    if (orderDivEl) {
        orderDivEl.innerHTML = textEl; // either the Greek paragraph or ""
    }
}



// export function hideSubmitLineOnClick(buttonIds) {
//     $(buttonIds).click(function () {
//         $('.submit-line').css('display', 'none');
//     });
// }
