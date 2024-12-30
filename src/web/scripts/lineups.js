// Manage saving Lineup
function saveLineup() {
    if (totalCost > totalBudget) {
        const popupError = document.getElementById('notificationPopupError');
        popupError.classList.toggle('hidden');

        setTimeout(() => {
            popupError.classList.add('hidden');
        }, 3000);
        return;
    }

    // Create an object to send to the server
    const lineupData = {
        userId: currentUserId,
        matchweek: currentMatchweek,
        players: selectedPlayers
    };

    // Send data to the backend using fetch
    fetch(`${url}/lineups/save`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(lineupData)
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const popupSuccess = document.getElementById('notificationPopupSuccess');
                popupSuccess.classList.toggle('hidden');
                
                setTimeout(() => {
                    popupSuccess.classList.add('hidden');
                }, 3000);
            } else {
                alert('Failed to save team');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while saving the team.');
        });
}

async function loadLineup(userId, matchweek) {
    try {
        const response = await fetch(`${url}/lineup/userId/${userId}/matchweek/${matchweek}`);
        const data = await response.json();

        if (data.success) {
            // Update the UI with the lineup data
            populateLineupUI(data.lineup);
        } else {
            console.error(data.message);
        }
    } catch (error) {
        console.error('Error loading lineup:', error);
    }
}

// Update lineup UI
function populateLineupUI(lineup) {
    removeAllPlayers();
    console.log(1)

    Object.values(lineup).forEach((playerId) => {
        if (playerId !== null) {
            selectPlayer(players[playerId]);
        }
    });
}