const puppeteer = require('puppeteer');
const db = require('./db');

// Fetch player stats by match
const fetchStatsByMatch = async (matchId) => {
    const url = `https://www.sofascore.com/api/v1/event/${matchId}/lineups`;
    
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url);
    
    // Extract the JSON data
    const playerStats = await page.evaluate(() => {
        const jsonData = document.querySelector('pre').innerText;
        return JSON.parse(jsonData);
    });

    await browser.close();

    // Check if 'home' and 'away' exist before accessing players
    const homePlayers = playerStats.home && playerStats.home.players
        ? playerStats.home.players.map(player => ({
            player: player.player,
            statistics: player.statistics,
            teamId: player.teamId,
            shirtNumber: player.shirtNumber,
            isHome: true
        }))
        : [];

    const awayPlayers = playerStats.away && playerStats.away.players
        ? playerStats.away.players.map(player => ({
            player: player.player,
            statistics: player.statistics,
            teamId: player.teamId,
            shirtNumber: player.shirtNumber,
            isHome: false
        }))
        : [];

    // Combine home and away players into one array if needed
    return [...homePlayers, ...awayPlayers];
};

// Fetch incidents by match -> get player stats (yellow cards,...)
const fetchIncidentsByMatch = async (matchId) => {
    const url = `https://www.sofascore.com/api/v1/event/${matchId}/incidents`;
    
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url);
    
    // Extract the JSON data
    const incidents = await page.evaluate(() => {
        const jsonData = document.querySelector('pre').innerText;
        return JSON.parse(jsonData);
    });

    await browser.close();
    
    // Filter and separate players with yellow and red cards
    const yellowCardedPlayers = incidents.incidents
        .filter(incident => incident.incidentType === 'card' && incident.incidentClass === 'yellow')
        .map(incident => incident.player);
    
    const redCardedPlayers = incidents.incidents
        .filter(incident => incident.incidentType === 'card' && incident.incidentClass === 'red')
        .map(incident => incident.player);

    return {
        yellowCardedPlayers,
        redCardedPlayers,
    };
};

// code for bugged data: playerId not in players table???
const checkAndInsertPlayer = async (player) => {
    const playerExistsQuery = 'SELECT 1 FROM players WHERE id = ?';
    const insertQuery =
        `INSERT INTO players
            (id, name, slug, shortName, position, jerseyNumber, height,
            dateOfBirth, proposedMarketValue,
            teamId, countryName, shirtNumber)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const values = [
        player.player.id,
        player.player.name || null,
        player.player.slug || null,
        player.player.shortName || null,
        player.player.position || null,
        player.player.jerseyNumber || null,
        player.player.height || null,
        player.player.dateOfBirthUntilTimestamp !== undefined ? new Date(player.player.dateOfBirthTimestamp * 1000) : null,
        player.player.proposedMarketValue || null,
        player.teamId || null,
        player.player.country.name || null,
        player.shirtNumber || null
    ];

    try {
        // Check if player exists
        const [result] = await db.query(playerExistsQuery, [player.player.id]);

        if (result.length > 0) {
            return;
        }

        await db.query(insertQuery, values);
    } catch (err) {
        console.error('Error processing player data:', err);
    }
};

// count cards from a list of carded players
const countCards = (playerId, cardedPlayers) => {
    return cardedPlayers.filter(player => player.id === playerId).length;
}

// get Home and Away Score from db to store goalsConceded attribute
// bc no goalsConceded in the provided urls
const getHomeScore = async (matchId) => {
    try {
        const homeScoreQuery = 'SELECT homeScore_current FROM matches WHERE id = ?';

        const [results] = await db.query(homeScoreQuery, [matchId]);

        if (results.length === 0) {
            console.warn('No match found with id:', matchId);
            return null; // No match found
        }

        return results[0].homeScore_current; // Return the home score
    } catch (err) {
        console.error('Error fetching homeScore of match:', matchId, err);
        throw err;
    }
}

const getAwayScore = async (matchId) => {
    try {
        const awayScoreQuery = 'SELECT awayScore_current FROM matches WHERE id = ?';

        const [results] = await db.query(awayScoreQuery, [matchId]);

        if (results.length === 0) {
            console.warn('No match found with id:', matchId);
            return null; // No match found
        }

        return results[0].awayScore_current; // Return the home score
    } catch (err) {
        console.error('Error fetching awayScore of match:', matchId, err);
        throw err;
    }
}

// Insert or update player stats by match
const insertOrUpdateStats = async (player, incidents, matchId) => {
    await checkAndInsertPlayer(player);

    const query = `
        INSERT INTO player_statistics (
            playerId, matchId, rating, minutesPlayed,
            goals, goalAssist,
            penaltyWon, penaltyMiss, penaltySave, penaltyConceded,
            ownGoals, saves, yellowCards, redCards, goalsConceded
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            rating = VALUES(rating),
            minutesPlayed = VALUES(minutesPlayed),
            goals = VALUES(goals),
            goalAssist = VALUES(goalAssist),
            penaltyWon = VALUES(penaltyWon),
            penaltyMiss = VALUES(penaltyMiss),
            penaltySave = VALUES(penaltySave),
            penaltyConceded = VALUES(penaltyConceded),
            ownGoals = VALUES(ownGoals),
            saves = VALUES(saves),
            yellowCards = VALUES(yellowCards),
            redCards = VALUES(redCards),
            goalsConceded = VALUES(goalsConceded);
        `;

    const values = [
        player.player.id,
        matchId,
        player.statistics?.rating || 0, 
        player.statistics?.minutesPlayed || 0,
        player.statistics?.goals || 0,
        player.statistics?.goalAssist || 0,
        player.statistics?.penaltyWon || 0,
        player.statistics?.penaltyMiss || 0,
        player.statistics?.penaltySave || 0,
        player.statistics?.penaltyConceded || 0,
        player.statistics?.ownGoals || 0,
        player.statistics?.saves || 0,
        countCards(player.player.id, incidents.yellowCardedPlayers),
        countCards(player.player.id, incidents.redCardedPlayers),
        player.isHome ? await getAwayScore(matchId) : await getHomeScore(matchId)
    ];
        
    await db.query(query, values, (err, result) => {
        if (err) {
            console.error('Error updating player:', player.player.id, err);
        }
    });
};

// Update stats across all matches
const updateAllStats = async () => {
    try {
        console.log('Updating all stats...\n');

        const [matches] = await db.query('SELECT id, round FROM matches WHERE tournamentId = 626 ORDER BY round');
        
        let currentRound = null;
        let hasValidDataInRound = false;

        for (const match of matches) {
            const players = await fetchStatsByMatch(match.id);
            const incidents = await fetchIncidentsByMatch(match.id);

            // Stop if a round doesn't have any data
            if (currentRound !== match.round) {
                if (currentRound !== null && !hasValidDataInRound) {
                    console.log(`No valid data in round ${currentRound}. Stopping.`);
                    break; // Stop processing further rounds
                }

                currentRound = match.round;
                hasValidDataInRound = false;
                console.log(`Updating stats for round: ${currentRound}`);
            }

            // Check if players and incidents data are present
            if (players.length === 0 || !incidents) { 
                console.log(`   No data for match ID ${match.id}`);
                continue; // Skip this match and continue with the next one
            }

            for (const player of players) {
                await insertOrUpdateStats(player, incidents, match.id);
            }

            hasValidDataInRound = true;
        }

        console.log('All stats updated.\n');
    } catch (error) {
        console.error('Error updating stats:', error);
    }
};

// Update stats for matches within 1h before startTime -> 24h after startTime
const updateRecentStats = async () => {
    try {
        console.log('Updating recent stats...\n');

        const oneHourLater = Date.now() + 60 * 60 * 1000;
        const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;

        // convert from ms to s
        const query = `
            SELECT id
            FROM matches
            WHERE UNIX_TIMESTAMP(startTime) * 1000 BETWEEN ? AND ?
            AND tournamentId = 626
        `;

        const [matchesToUpdate] = await db.query(query, [twentyFourHoursAgo, oneHourLater]);

        if (matchesToUpdate.length === 0) {
            console.log('No matches need updating at this time.\n');
            return;
        }
        
        for (const match of matchesToUpdate) {
            const players = await fetchStatsByMatch(match.id);
            const incidents = await fetchIncidentsByMatch(match.id);

            // Check if players and incidents data are present
            if (players.length === 0 || !incidents) { 
                console.log(`   No data for match ID ${match.id}`);
                continue; // Skip this match and continue with the next one
            }

            for (const player of players) {
                await insertOrUpdateStats(player, incidents, match.id);
            }
        }

        console.log('\nRecent stats updated.\n');
    } catch (error) {
        console.error('Error updating stats:', error);
    }
};

// Start the update process
// updateAllStats();

module.exports = { updateAllStats, updateRecentStats };

