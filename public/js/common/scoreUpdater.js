export async function updatePlayerScore(username, score, method) {
    console.log("--- Sending Score Update ---");
    console.log(`Username: ${username}, Score: ${score}, Method: ${method}`);

    try {
        const response = await fetch('/api/update-score', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, score, method })
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const result = await response.json();
        console.log('Score updated successfully:', result);
        return result;
    } catch (error) {
        console.error('Error updating score:', error);
        throw error;
    }
}
