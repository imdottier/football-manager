const puppeteer = require('puppeteer');
const db = require('./db');

// Fetch matches data by round
const fetchMatchesByRound = async (tournamentId, seasonId, round) => {
    const url = `https://www.sofascore.com/api/v1/unique-tournament/${tournamentId}/season/${seasonId}/events/round/${round}`;
    
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url);
    
    // Extract the JSON data
    const matchesData = await page.evaluate(() => {
        const jsonData = document.querySelector('pre').innerText;
        return JSON.parse(jsonData);
    });

    await browser.close();
    
    return matchesData.events;
};

// Fetch matches data by matchId
const fetchMatchesById = async (matchId) => {
    const url = `https://www.sofascore.com/api/v1/event/${matchId}`;

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url);
    
    // Extract the JSON data
    const resultsData = await page.evaluate(() => {
        const jsonData = document.querySelector('pre').innerText;
        return JSON.parse(jsonData);
    });

    await browser.close();
    
    return resultsData.event;
}

// Insert or update match result
const insertOrUpdateMatches = async (match) => {
    const query = `
        INSERT INTO matches (
            id, round, status_code, status_description, status_type,
            winnerCode, homeTeamId, awayTeamId,
            homeScore_current, homeScore_period1, homeScore_period2,
            awayScore_current, awayScore_period1, awayScore_period2,
            slug, startTime, tournamentId, seasonId
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            round = VALUES(round),
            status_code = VALUES(status_code),
            status_description = VALUES(status_description),
            status_type = VALUES(status_type),
            winnerCode = VALUES(winnerCode),
            homeTeamId = VALUES(homeTeamId),
            awayTeamId = VALUES(awayTeamId),
            homeScore_current = VALUES(homeScore_current),
            homeScore_period1 = VALUES(homeScore_period1),
            homeScore_period2 = VALUES(homeScore_period2),
            awayScore_current = VALUES(awayScore_current),
            awayScore_period1 = VALUES(awayScore_period1),
            awayScore_period2 = VALUES(awayScore_period2),
            slug = VALUES(slug),
            startTime = VALUES(startTime),
            tournamentId = VALUES(tournamentId),
            seasonId = VALUES(seasonId)
        `;

    const values = [
        match.id !== undefined ? match.id : null,
        match.roundInfo?.round !== undefined ? match.roundInfo.round : null,
        match.status?.code !== undefined ? match.status.code : null,
        match.status?.description !== undefined ? match.status.description : null,
        match.status?.type !== undefined ? match.status.type : null,
        match.winnerCode !== undefined ? match.winnerCode : null,
        match.homeTeam?.id !== undefined ? match.homeTeam.id : null,
        match.awayTeam?.id !== undefined ? match.awayTeam.id : null,
        match.homeScore?.current !== undefined ? match.homeScore.current : null,
        match.homeScore?.period1 !== undefined ? match.homeScore.period1 : null,
        match.homeScore?.period2 !== undefined ? match.homeScore.period2 : null,
        match.awayScore?.current !== undefined ? match.awayScore.current : null,
        match.awayScore?.period1 !== undefined ? match.awayScore.period1 : null,
        match.awayScore?.period2 !== undefined ? match.awayScore.period2 : null,
        match.slug !== undefined ? match.slug : null,
        match.startTimestamp !== undefined ? new Date(match.startTimestamp * 1000) : null,
        match.tournament.uniqueTournament.id !== undefined ? match.tournament.uniqueTournament.id : null,
        match.season.id !== undefined ? match.season.id : null
    ];
        
    await db.query(query, values, (err, result) => {
        if (err) {
            console.error('Error updating match:', match.slug, err);
        }
    });
};

// Update matches across all rounds
const updateAllMatches = async () => {
    const keys = [
		{
			tournamentId: 626,
			seasonId: 65000
		},
		{
			tournamentId: 771,
			seasonId: 66978
		}
	];

    try {
        console.log('Updating all matches...\n');

        for (const key of keys) {
            console.log('Updating matches for tournament:', key.tournamentId, key.seasonId);

            for (let round = 1; round <= 26; round++) {
                const matches = await fetchMatchesByRound(key.tournamentId, key.seasonId, round);

                if (!Array.isArray(matches) || matches.length === 0) {
                    console.log(`No matches found for round ${round}. Skipping...`);
                    continue;
                }
    
                for (const match of matches) {
                    await insertOrUpdateMatches(match, key.tournamentId, key.seasonId);
                }
    
                console.log('Finished updating matches for round:', round);
            }
    
            console.log('Finished updating matches for tournament: ', key.tournamentId, key.seasonId);
        }

        console.log('\nAll matches updated.\n');
    } catch (error) {
        console.error('Error updating matches:', error);
    }
};

// Update matches within 30 mins before startTime -> 3h30mins after startTime
const updateRecentMatches = async () => {
    try {
        console.log('Updating recent matches...\n');

        const thirtyMinutesLater = Date.now() + 30 * 60 * 1000;
        const threeAndHalfHoursAgo = Date.now() - 3.5 * 60 * 60 * 1000;

        // convert from ms to s
        const query = `
            SELECT id
            FROM matches
            WHERE UNIX_TIMESTAMP(startTime) * 1000 BETWEEN ? AND ?
        `;

        const [matchesToUpdate] = await db.query(query, [threeAndHalfHoursAgo, thirtyMinutesLater]);

        if (matchesToUpdate.length === 0) {
            console.log('No matches need updating at this time.\n');
            return;
        }

        for (const matchId in matchesToUpdate) {
            const matches = await fetchMatchesById(matchId);

            for (const match in matches) {
                await insertOrUpdateMatches(match);
            }
        }

        console.log('\nRecent matches updated.\n');
    } catch (error) {
        console.error('Error updating matches:', error);
    }
};


// Start the update process
// updateAllMatches();
// updateRecentMatches();

module.exports = { updateAllMatches, updateRecentMatches };