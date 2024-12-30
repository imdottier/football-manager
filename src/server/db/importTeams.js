const puppeteer = require('puppeteer');
const db = require('./db');

// Fetch team data by tournamentId and seasonId
const fetchTeamData = async (tournamentId, seasonId) => {
    const url = `https://www.sofascore.com/api/v1/unique-tournament/${tournamentId}/season/${seasonId}/teams`;

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url);
    
    // Extract the JSON data
    const teamData = await page.evaluate(() => {
        const jsonData = document.querySelector('pre').innerText;
        return JSON.parse(jsonData);
    });

    await browser.close();
    
    return teamData.teams;
};

// Insert or update match result
const insertOrUpdateTeam = async (team, tournamentId) => {
	const query = `
		INSERT INTO teams (
			id, name, slug, shortName, nameCode,
			teamColors_primary, teamColors_secondary, teamColors_text,
			tournamentId
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON DUPLICATE KEY UPDATE
			name = VALUES(name),
			slug = VALUES(slug),
			shortName = VALUES(shortName),
			nameCode = VALUES(nameCode),
			teamColors_primary = VALUES(teamColors_primary),
			teamColors_secondary = VALUES(teamColors_secondary),
			teamColors_text = VALUES(teamColors_text),
			tournamentId = VALUES(tournamentId);
	`;
	
	const teamColors = team.teamColors;

	const values = [
		team.id, team.name, team.slug, team.shortName, team.nameCode,
		teamColors.primary, teamColors.secondary, teamColors.text,
		tournamentId
	];

	await db.query(query, values, (err, result) => {
        if (err) {
            console.error('Error updating team:', team.id, err);
        }
    });
};

// Update matches across all rounds
const updateAllTeams = async () => {
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
		console.log('Fetching team data...\n');

		for (const key of keys) {
			const teams = await fetchTeamData(key.tournamentId, key.seasonId);

			console.log('Start updating teams for tournament:', key.tournamentId);

			for (const team of teams) {
				await insertOrUpdateTeam(team, key.tournamentId);

				// console.log('Finished updating for team:', team.id);
			}

			console.log('Finished updating teams for tournament:', key.tournamentId);
		}

		console.log('\nTeam data fetched.\n');
    } catch (error) {
        console.error('Error updating teams:', team.id, error);
    }
};

// updateAllTeams();

module.exports = updateAllTeams;