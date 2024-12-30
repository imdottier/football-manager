// get current matchweek and time until the matchweek starts
async function getMatchweek() {
    try {
        const response = await fetch(`${url}/matchweek/next`);
        const data = await response.json();

        currentMatchweek = data.matchweek;
        const matchDate = new Date(data.matchweekStartTime);

        const now = new Date();
        const countdown = matchDate - now;

        // Remaining time
        const days = Math.floor(countdown / (1000 * 60 * 60 * 24)); // Days
        const hours = Math.floor((countdown % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)); // Hours
        const minutes = Math.floor((countdown % (1000 * 60 * 60)) / (1000 * 60)); // Minutes

        const timeText = `${days}d ${hours}h ${minutes}m remaining`;

        // Insert matchweek data
        document.getElementById('currentMatchweekPage').innerHTML = `
            <h2 class="text-white text-xl text-center font-bold">Matchweek ${currentMatchweek}</h2>
            <p class="text-white text-center">${timeText}</p>
        `;
    } catch (err) {
        console.error('Error fetching matchweek data:', err);
    }
}

// load fixtures
function loadFixtures(matchweek) {
    fetch(`${url}/matchweek/${matchweek}/fixtures`)
        .then(response => response.json())
        .then(data => {
        const fixtureContainer = document.getElementById('fixturePage');
        fixtureContainer.innerHTML = ''; // Clear current fixtures

        let currentDate = '';

        data.forEach(fixture => {
            const fixtureDate = new Date(fixture.startTime);
            const fixtureTime = fixture.status_code !== 0 // If match is ongoing/finished (status_code !== 0)
                ? `${fixture.homeScore_current}-${fixture.awayScore_current}`  // Display score 
                : fixtureDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });  // Else display time
            
            const dateStr = fixtureDate.toLocaleDateString('en-GB', {
                weekday: 'long', // Thursday
                day: 'numeric', // 7
                month: 'long', // November
                year: 'numeric' // 2024
            });

            // Separate matches by date
            if (currentDate !== dateStr) {
                const dateHeader = document.createElement('h3');
                dateHeader.textContent = dateStr;
                // Styling the date header with Tailwind CSS
                dateHeader.classList.add('text-2xl', 'text-center', 'my-6', 'p-4', 
                    'bg-gray-200', 'capitalize', 'border-t-4');
                fixtureContainer.appendChild(dateHeader);
                currentDate = dateStr;
            }

            // Create and display the match
            const matchItem = document.createElement('div');
            matchItem.classList.add('match-item', 'w-1/2', 'p-4', 'my-4', 'bg-white',
                'rounded-lg', 'shadow-md', 'text-center', 'mx-auto', 'border', 'border-gray-300');

            matchItem.innerHTML = `
                <div class="flex justify-between items-center">
                    <!-- Left Team Name -->
                    <span class="flex-1 text-right text-xl font-semibold">${fixture.homeTeam}</span>
                    
                    <!-- Score Box centered -->
                    <span class="text-2xl font-semibold text-blue-600 mx-4 flex-shrink-0">
                        ${fixtureTime}
                    </span>
                    
                    <!-- Right Team Name -->
                    <span class="flex-1 text-left text-xl font-semibold">${fixture.awayTeam}</span>
                </div>
            `;

            fixtureContainer.appendChild(matchItem);     
        });
        })
        .catch(error => console.error('Error loading fixtures:', error));
}

// next and previous matchweek button
function changeMatchweek(num) {
    if (displayMatchweek + num > 26 || displayMatchweek + num < 1) {
        return;
    }
    displayMatchweek += num;
    updateMatchweek();
    loadFixtures(displayMatchweek);

    loadLineup(currentUserId, displayMatchweek);
}

function updateMatchweek() {
    document.getElementById('matchweekNumber').textContent = `Matchweek: ${displayMatchweek}`;
}

// update player count and remaining budget
function updateStatistics() {
    // Update player count
    document.getElementById('playerCount').textContent = `Players: ${Object.keys(selectedPlayers).length}/15`;

    // Update remaining budget
    const remainingBudget = totalBudget - totalCost;
    document.getElementById('remainingBudget').textContent = `Remaining Budget: $${remainingBudget.toFixed(1)}`;

    totalScore = 0;
    for (playerId in selectedPlayers) {
        totalScore += players[playerId].matchweekScores[displayMatchweek - 1];
    }

    document.getElementById('totalScore').textContent = totalScore;
    document.getElementById('totalPrice').textContent = `$${totalCost.toFixed(1)}`;
}