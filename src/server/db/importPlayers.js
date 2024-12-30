const puppeteer = require('puppeteer');
const db = require('./db');

// Fetch player data for a team
const fetchPlayersForTeam = async (teamId) => {
    const url = `https://www.sofascore.com/api/v1/team/${teamId}/players`;
    
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url);
    
    // Extract the JSON data
    const playerData = await page.evaluate(() => {
        const jsonData = document.querySelector('pre').innerText;
        return JSON.parse(jsonData);
    });

    await browser.close();
    
    return playerData.players;
};

// Insert or update players
const insertOrUpdatePlayer = async (player) => {
    const query = `
        INSERT INTO players (
            id, name, slug, shortName, position, jerseyNumber, height,
            preferredFoot, gender, dateOfBirth, contractUntil, proposedMarketValue,
            teamId, countryName, shirtNumber
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            name = COALESCE(VALUES(name), name),
            slug = COALESCE(VALUES(slug), slug),
            shortName = COALESCE(VALUES(shortName), shortName),
            position = COALESCE(VALUES(position), position),
            jerseyNumber = COALESCE(VALUES(jerseyNumber), jerseyNumber),
            height = COALESCE(VALUES(height), height),
            preferredFoot = COALESCE(VALUES(preferredFoot), preferredFoot),
            gender = COALESCE(VALUES(gender), gender),
            dateOfBirth = COALESCE(FROM_UNIXTIME(VALUES(dateOfBirth)), dateOfBirth),
            contractUntil = COALESCE(
                IF(VALUES(contractUntil) = 0, NULL, FROM_UNIXTIME(VALUES(contractUntil))),
                contractUntil
            ),
            proposedMarketValue = COALESCE(VALUES(proposedMarketValue), proposedMarketValue),
            teamId = COALESCE(VALUES(teamId), teamId),
            countryName = COALESCE(VALUES(countryName), countryName),
            shirtNumber = COALESCE(VALUES(shirtNumber), shirtNumber)
    `;

    const values = [
        player.id,
        player.name || null,
        player.slug || null,
        player.shortName || null,
        player.position || null,
        player.jerseyNumber || null,
        player.height || null,
        player.preferredFoot || null,
        player.gender || null,
        player.dateOfBirthUntilTimestamp !== undefined ? new Date(player.dateOfBirthTimestamp * 1000) : null,
        player.contractUntilTimestamp !== undefined && player.contractUntilTimestamp !== 0
            ? new Date(player.contractUntilTimestamp * 1000) 
            : null,
        player.proposedMarketValue || null,
        player.team.id || null,
        player.country.name || null,
        player.shirtNumber || null
    ];

    try {
        const [teamCheck] = await db.query('SELECT id FROM teams WHERE id = ?', [player.team.id]);
        if (teamCheck.length === 0) {
            console.log(`Skipping player ${player.name} due to missing team with ID ${player.team.id}`);
            return; // Skip player if the team doesn't exist
        }

        await db.query(query, values, (err, result) => {
            if (err) {
                console.error('Error inserting/updating player:', player.name, err);
            }
        });
    } catch (error) {
        console.error('Team not exists:', error);
    }
};

// Update players for all teams
const updatePlayersForAllTeams = async () => {
    try {
        console.log('Updating players for all teams...\n');

        const [teams] = await db.query('SELECT id FROM teams where tournamentId = 626');

        for (const team of teams) {
            const players = await fetchPlayersForTeam(team.id);

            for (const p of players) {
                const player = p.player;
                await insertOrUpdatePlayer(player);
            }

            console.log('Finished updating for team:', team.id);
        }

        console.log('\nAll players updated.\n');
    } catch (error) {
        console.error('Error updating players:', error);
    }
};

// Start the update process
// updatePlayersForAllTeams();

module.exports = updatePlayersForAllTeams;