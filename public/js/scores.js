$(document).ready(() => {
    const username = sessionStorage.getItem('username'); // Retrieve the username from sessionStorage
    if (!username) {
        console.error("Username not found in sessionStorage");
        return;
    }

    function updateScoresBasedOnLanguage() {
        const currentLanguage = $('html').attr('lang') || 'el';
        const { primTableId, kruskalTableId, playerPrimId, playerKruskalId } = getTableIds(currentLanguage);

        // Fetch scores for the player's username
        $.ajax({
            url: `/api/scores?username=${encodeURIComponent(username)}`, // Pass username as query parameter
            method: 'GET',
            success: (response) => {
                if (response.scores) {
                    // Update the player's scores table
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

        // Fetch top scores for Prim and Kruskal
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

    // Function to get table and player score IDs based on language
    function getTableIds(language) {
        return {
            primTableId: language === 'en' ? '#prim-scores-en' : '#prim-scores-el',
            kruskalTableId: language === 'en' ? '#kruskal-scores-en' : '#kruskal-scores-el',
            playerPrimId: language === 'en' ? '#player-prim-en' : '#player-prim-el',
            playerKruskalId: language === 'en' ? '#player-kruskal-en' : '#player-kruskal-el',
        };
    }

    // Function to render top scores dynamically
    function renderScores(primScores, kruskalScores, primTableId, kruskalTableId) {
        const primTable = $(primTableId);
        const kruskalTable = $(kruskalTableId);

        const headers = `<tr><th>${$('html').attr('lang') === 'en' ? 'Rank' : 'Θέση'}</th>
                         <th>${$('html').attr('lang') === 'en' ? 'Username' : 'Όνομα Χρήστη'}</th>
                         <th>${$('html').attr('lang') === 'en' ? 'Score' : 'Βαθμολογία'}</th></tr>`;

        primTable.html(headers);
        kruskalTable.html(headers);

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

    // Observe changes to the 'lang' attribute of the <html> element
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'lang') {
                updateScoresBasedOnLanguage(); // Update scores when language changes
            }
        });
    });

    // Start observing the <html> element
    observer.observe(document.documentElement, { attributes: true });

    // Initial scores update
    updateScoresBasedOnLanguage();
});
