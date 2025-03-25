export function updateScores() {
    const username = sessionStorage.getItem('username');
    if (!username) {
        console.error("Username not found in sessionStorage");
        return;
    }

    const currentLanguage = $('html').attr('lang') || 'el';
    const { primTableId, kruskalTableId, playerPrimId, playerKruskalId } = getTableIds(currentLanguage);

    // Fetch player scores
    $.ajax({
        url: `/api/scores?username=${encodeURIComponent(username)}`,
        method: 'GET',
        success: (response) => {
            if (response.scores) {
                $(playerPrimId).text(response.scores.prim || 0);
                $(playerKruskalId).text(response.scores.kruskal || 0);
            } else {
                console.error("Scores data missing in response");
            }
        },
        error: (err) => {
            console.error("Failed to fetch scores:", err);
        }
    });

    // Fetch top scores
    $.ajax({
        url: '/api/top-scores',
        method: 'GET',
        success: (response) => {
            if (response.prim && response.kruskal) {
                renderScores(response.prim, response.kruskal, primTableId, kruskalTableId);
            } else {
                console.error('Prim or Kruskal data missing in response');
            }
        },
        error: (err) => {
            console.error('Failed to load top scores:', err);
        }
    });
}

function getTableIds(language) {
    return {
        primTableId: language === 'en' ? '#prim-scores-en' : '#prim-scores-el',
        kruskalTableId: language === 'en' ? '#kruskal-scores-en' : '#kruskal-scores-el',
        playerPrimId: language === 'en' ? '#player-prim-en' : '#player-prim-el',
        playerKruskalId: language === 'en' ? '#player-kruskal-en' : '#player-kruskal-el',
    };
}

function renderScores(primScores, kruskalScores, primTableId, kruskalTableId) {
    const primTable = $(primTableId);
    const kruskalTable = $(kruskalTableId);

    // Clear existing rows
    primTable.empty();
    kruskalTable.empty();

    // Add headers
    primTable.append(`<tr><th>Rank</th><th>Username</th><th>Score</th></tr>`);
    kruskalTable.append(`<tr><th>Rank</th><th>Username</th><th>Score</th></tr>`);

    primScores.forEach((player, index) => {
        primTable.append(`<tr>
                            <td>${index + 1}</td>
                            <td>${player.username}</td>
                            <td>${player.score}</td>
                          </tr>`);
    });

    kruskalScores.forEach((player, index) => {
        kruskalTable.append(`<tr>
                               <td>${index + 1}</td>
                               <td>${player.username}</td>
                               <td>${player.score}</td>
                             </tr>`);
    });
}