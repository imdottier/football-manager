class Player {
    constructor(id, name, position, price, totalScore, teamId, teamName, appearances) {
        this.id = id;
        this.name = name || "N/A";
        this.position = position || "N/A";
        this.price = price;
        this.totalScore = totalScore;
        this.teamId = teamId || "N/A";
        this.teamName = teamName;
        this.appearances = appearances,
        this.matchweekScores = Array(26).fill(0);
    }
}

// Get list of players
fetch(`${url}/players`)
    .then(response => response.json())
    .then(playersData => {
        playersData.forEach(playerData => {
            players[playerData.id] = new Player(
                playerData.id,
                playerData.name, 
                playerData.position, 
                playerData.price, 
                playerData.totalScore,
                playerData.teamId,
                playerData.teamName,
                playerData.appearances
            );
        });
        

        // Populate the table with the fetched data
        const tbody = document.getElementById('playerData');
        tbody.innerHTML = ''; // Clear existing data

        Object.values(players).forEach(player => {
            const row = document.createElement('tr');
            row.classList.add("player-row", "hover:cursor-pointer");
            row.dataset.id = player.id;

            row.innerHTML = `
                <td class="border border-gray-600 px-4 py-2">${player.name}</td>
                <td class="border border-gray-600 text-center px-4 py-2">${player.position}</td>
                <td class="border border-gray-600 text-center px-4 py-2">${player.price.toFixed(1)}</td>
                <td class="border border-gray-600 text-center px-4 py-2">${player.totalScore}</td>
            `;

            row.onclick = function () {
                selectPlayer(player);
            };

            tbody.appendChild(row);
        });

        initializePlayerStates();

        // Sort players by price DESC after loading
        sortTable(2);
    })
    .catch(error => console.error('Error fetching player data:', error));


// Fetch matchweek data and update player matchweekScores
function fetchMatchweekScores(currentMatchweek) {
    for (let matchweek = 1; matchweek < currentMatchweek; matchweek++) {
        fetch(`${url}/matchweek/${matchweek}/stats`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                data.players.forEach(playerData => {
                    const player = players[playerData.playerId];
                    if (player) {
                        // Update the matchweek score for the given matchweek
                        player.matchweekScores[matchweek - 1] = playerData.matchweekScore;
                    }
                });
            }
        })
        .catch(error => console.error(`Error fetching matchweek ${matchweek} scores:`, error));
    }
}


// Sort players by price, score
function sortTable(n) {
    const table = document.getElementById("sortableTable");
    const rows = Array.from(table.rows).slice(1); // Get all rows except header row
    
    // Toggle the sort direction based on the current state
    sortOrder[n] = !sortOrder[n];

    const dir = sortOrder[n] ? "asc" : "desc";

    // Sort rows based on the selected column (n)
    rows.sort((rowA, rowB) => {
        const x = rowA.getElementsByTagName("TD")[n];
        const y = rowB.getElementsByTagName("TD")[n];
        const valA = parseFloat(x.innerText.replace(/[^0-9.-]+/g, "")) || x.innerText;
        const valB = parseFloat(y.innerText.replace(/[^0-9.-]+/g, "")) || y.innerText;

        if (dir === "asc") {
            return valA > valB ? 1 : (valA < valB ? -1 : 0);
        } else {
            return valA < valB ? 1 : (valA > valB ? -1 : 0);
        }
    });

    // Append sorted rows back to the table body
    const tbody = document.getElementById('playerData');
    rows.forEach(row => tbody.appendChild(row));

    // Update the column arrows
    updateArrows(n);
}

// Update arrow (sort direction)
function updateArrows(sortedColumnIndex) {
    const arrows = document.querySelectorAll('.sort-arrow');
    arrows.forEach((arrow, index) => {
        arrow.innerHTML = ''; // Reset all arrows
        if (index === sortedColumnIndex) {
            arrow.innerHTML = sortOrder[index] ? '↑' : '↓'; // Down or up arrow
        }
    });
}


// Initialize an object storing player states by id
function initializePlayerStates() {
    const rows = document.querySelectorAll('.player-row');
    
    rows.forEach(row => {
        const playerId = row.dataset.id; // Get player ID from data-id attribute
        playerStates[playerId] = 'canBeChosen'; // Default state
    });
}


// Add/Remove a player from the lineup
function selectPlayer(player) {
    if (playerStates[player.id] === 'canBeChosen') {
        const slotId = findAvailableSlot(player.position);

        if (slotId) {
            const slot = document.querySelector(`[data-position="${slotId}"]`);
            slot.id = player.id;

            const playerNameDiv = slot.querySelector('.player-name');
            playerNameDiv.textContent = player.name;

            const playerScoreDiv = slot.querySelector('.player-points');
            playerScoreDiv.textContent = player.matchweekScores[displayMatchweek - 1];

            playerStates[player.id] = 'alreadyOnField';
        }

        // update statistics
        selectedPlayers[player.id] = slotId;
        totalCost += player.price;
    } else if (playerStates[player.id] === 'alreadyOnField') {
        const slotId = findSlotForPlayer(player); // Find the player's current slot

        if (slotId) {
            const slot = document.querySelector(`[data-position="${slotId}"]`);
            slot.removeAttribute('id');

            const playerNameDiv = slot.querySelector('.player-name');
            playerNameDiv.textContent = player.position;

            const playerScoreDiv = slot.querySelector('.player-points');
            playerScoreDiv.textContent = 'Points';

            playerStates[player.id] = 'canBeChosen'; // Mark as available to be chosen
        }

        // update statistics
        delete selectedPlayers[player.id];
        totalCost -= player.price;
    } else {
        return;
    }

    updateStatistics();
    updatePlayerStates(player.position);
}

// Update all player states after an action
function updatePlayerStates(position) {
    // Check slots for the specified position
    const slots = document.querySelectorAll(`[data-position^="${position}"]`); // check if data-position starts with {position} (FWD, MID,...)
    const allSlotsFilled = Array.from(slots).every(slot => slot.querySelector('.player-name').textContent !== position);

    // Update the state of players for the given position
    for (const playerId in playerStates) {
        // Find the player's row and get the player's position
        const row = document.querySelector(`.player-row[data-id="${playerId}"]`);
        if (!row) continue;

        const playerPosition = row.querySelector('td:nth-child(2)').textContent.trim(); // hardcode, position 2nd column

        // Only update players matching the given position
        if (playerPosition === position) {
            if (playerStates[playerId] === 'alreadyOnField') {
                continue; // Players already on the field stay unchanged
            }

            // Update state based on slot availability
            if (allSlotsFilled) {
                playerStates[playerId] = 'noSlotsAvailable';
            } else {
                playerStates[playerId] = 'canBeChosen';
            }
        }
    }

    renderPlayerStates(); // Update the UI to reflect changes
}

// Change UI after updating states
function renderPlayerStates() {
    const rows = document.querySelectorAll('.player-row');
    rows.forEach(row => {
        const playerId = row.dataset.id;
        const state = playerStates[playerId];

        // Reset all row styles
        row.classList.remove('bg-blue-500', 'bg-gray-500', 'bg-blue-300');
        
        // Always set the cursor to pointer
        row.classList.add('cursor-pointer');
        
        if (state === 'canBeChosen') {
            row.classList.add('bg-normal'); // normal color for canBeChosen
        } else if (state === 'alreadyOnField') {
            row.classList.add('bg-blue-300'); // brighter blue for alreadyOnField
        } else if (state === 'noSlotsAvailable') {
            row.classList.add('bg-gray-500'); // grey for no slots available
        }
    });
}

// Find slot of a specific player in the lineup
function findSlotForPlayer(player) {
    const slots = document.querySelectorAll(`[data-position^="${player.position}"]`);  // Select all slots with the player position
    for (let slot of slots) {
        const playerName = slot.querySelector('.player-name').textContent;

        // Check if the slot contains the player's name
        if (playerName === player.name) {
            return slot.getAttribute('data-position'); // Return the value of the data-position attribute
        }
    }
    return null; // If player is not found in any slot, return null
}

// Find slot for a position in the lineup
function findAvailableSlot(position) {
    // Dynamically select the slots based on the given position
    let slots = document.querySelectorAll(`[data-position^="${position}"]`);  // Matches all positions starting with the given position
    
    for (let slot of slots) {
        const playerName = slot.querySelector('.player-name').textContent;

        // Check if the slot contains the placeholder text (e.g., 'FWD', 'MID', 'DEF', etc.)
        if (playerName === position) {
            return slot.getAttribute('data-position'); // Return the value of the data-position attribute
        }
    }
    
    return ''; // No available slots
}

// Remove all players
function removeAllPlayers() {
    for (const playerId in players) {
        if (playerStates[playerId] === 'alreadyOnField') {
            selectPlayer(players[playerId]);
        }
    }
}

// Hide/Show player stats
function togglePlayerDataPopup(element) {
    const playerText = element.textContent;

    const playerDataPopup = document.getElementById('playerDataPopup');

    if (playerText === 'Close') {
        playerDataPopup.classList.toggle('hidden');
        return;
    }

    if (playerText !== 'FWD' && playerText !== 'MID' && playerText !== 'DEF' && playerText !== 'GK') {
        const playerId = element.id;
        const player = players[playerId];

        document.getElementById('playerName').textContent = player.name;
        document.getElementById('playerTeam').textContent = player.teamName;

        document.getElementById('playerAppearances').textContent = player.appearances;
        document.getElementById('playerTotalScore').textContent = player.totalScore;

        playerDataPopup.classList.toggle('hidden');
    }
}