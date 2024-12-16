export function isEdgeInTable(actionHistory, edgeId) {
    return actionHistory.some(({ edge }) => edge.id() === edgeId);
}

export function isNodeInTable(actionHistory, nodeId) {
    return actionHistory.some(({ sourceNode, targetNode }) => sourceNode.id() === nodeId || targetNode.id() === nodeId);
}