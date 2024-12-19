$(document).ready(() => {
    const username = sessionStorage.getItem('username'); // Retrieve the username from sessionStorage
    if (!username) {
        console.error("Username not found in sessionStorage");
        return;
    }

    function updateScoresBasedOnLanguage(language) {
        const { primTableId, kruskalTableId } = getTableIds(language);

        // Fetch scores for the player's username
        $.ajax({
            url: `/api/scores?username=${encodeURIComponent(username)}`, // Pass username as query parameter
            method: 'GET',
            success: (response) => {
                // console.log("API Response:", response);

                if (response.scores) {
                    displayPlayerScores(response.scores, language);
                } else {
                    console.error("Scores data missing in response");
                }
            },
            error: (err) => {
                console.error("Failed to fetch scores:", err);
            }
        });

        // Fetch top scores for Prim and Kruskal
        $.ajax({
            url: '/api/top-scores',
            method: 'GET',
            success: (response) => {
                if (response.prim && response.kruskal) {
                    renderScores(response.prim, response.kruskal, primTableId, kruskalTableId, language);
                } else {
                    console.error('Prim or Kruskal data missing in response');
                }
            },
            error: (err) => {
                console.error('Failed to load top scores:', err);
            }
        });
    }

    // Function to get table IDs based on language
    function getTableIds(language) {
        return {
            primTableId: language === 'en' ? '#prim-scores-en' : '#prim-scores-el',
            kruskalTableId: language === 'en' ? '#kruskal-scores-en' : '#kruskal-scores-el',
        };
    }

    // Function to render top scores dynamically
    function renderScores(primScores, kruskalScores, primTableId, kruskalTableId, language) {
        const primTable = $(primTableId);
        const kruskalTable = $(kruskalTableId);

        // Set translated headers
        const headers = language === 'en'
            ? `<tr><th>Rank</th><th>Username</th><th>Score</th></tr>`
            : `<tr><th>Θέση</th><th>Όνομα Χρήστη</th><th>Σκορ</th></tr>`;

        primTable.html(headers);
        kruskalTable.html(headers);

        // Add table rows for Prim
        primScores.forEach((player, index) => {
            primTable.append(
                `<tr>
                    <td>${index + 1}</td>
                    <td>${player.username}</td>
                    <td>${player.score}</td>
                </tr>`
            );
        });

        // Add table rows for Kruskal
        kruskalScores.forEach((player, index) => {
            kruskalTable.append(
                `<tr>
                    <td>${index + 1}</td>
                    <td>${player.username}</td>
                    <td>${player.score}</td>
                </tr>`
            );
        });
    }

    // Function to display player scores
    function displayPlayerScores(scores, language) {
        const scoresDiv = $('#player-scores');
        const theText = language === 'en' ? 'Your Scores' : 'Τα σκορ σου';
        const primText = language === 'en' ? "Prim:" : "Prim:";
        const kruskalText = language === 'en' ? "Kruskal:" : "Kruskal:";

        scoresDiv.html(`
            <p><strong>${theText}</strong></p>
            <p><strong>${primText}</strong> ${scores.prim || 0}</p>
            <p><strong>${kruskalText}</strong> ${scores.kruskal || 0}</p>
        `);
    }

    // Use your existing language switcher to detect language changes
    const savedLanguage = localStorage.getItem('language') || 'el';
    updateScoresBasedOnLanguage(savedLanguage);

    $('#switch-lang').click(() => {
        const newLanguage = localStorage.getItem('language') || 'el';
        updateScoresBasedOnLanguage(newLanguage);
    });
});
