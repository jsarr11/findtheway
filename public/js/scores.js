$(document).ready(() => {
    const username = sessionStorage.getItem('username'); // Retrieve the username from sessionStorage
    if (!username) {
        console.error("Username not found in sessionStorage");
        return;
    }

    const currentLanguage = localStorage.getItem('language') || 'el';

    // Function to get table IDs based on language
    const getTableIds = (language) => {
        return {
            primTableId: language === 'en' ? '#prim-scores-en' : '#prim-scores-el',
            kruskalTableId: language === 'en' ? '#kruskal-scores-en' : '#kruskal-scores-el',
        };
    };

    const { primTableId, kruskalTableId } = getTableIds(currentLanguage);

    // Fetch scores for the player's username
    $.ajax({
        url: `/api/scores?username=${encodeURIComponent(username)}`, // Pass username as query parameter
        method: 'GET',
        success: (response) => {
            console.log("API Response:", response);

            if (response.scores) {
                displayPlayerScores(response.scores, currentLanguage);
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
                renderScores(response.prim, response.kruskal, primTableId, kruskalTableId, currentLanguage);
            } else {
                console.error('Prim or Kruskal data missing in response');
            }
        },
        error: (err) => {
            console.error('Failed to load top scores:', err);
        }
    });

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
        const primText = language === 'en' ? "Prim Total Score:" : "Συνολικό Σκορ Prim:";
        const kruskalText = language === 'en' ? "Kruskal Total Score:" : "Συνολικό Σκορ Kruskal:";

        scoresDiv.html(`
        <p>${primText} ${scores.prim || 0}</p>
        <p>${kruskalText} ${scores.kruskal || 0}</p>
    `);
    }


    // Add event listener for language switching
    $('#switch-lang').click(() => {
        const newLanguage = currentLanguage === 'en' ? 'el' : 'en';
        localStorage.setItem('language', newLanguage);
        window.location.reload(); // Reload page to re-render content
    });
});
