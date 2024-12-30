const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db/db');

const runAllUpdates = require('./getData');

runAllUpdates();

const app = express();
const port = 3000;

app.use(cors()); // Enable Cross-Origin Resource Sharing for frontend
app.use(express.json()); // Parse JSON bodies

const JWT_SECRET = 'secret-key'; // You should use an environment variable for this in production

// POST /register to handle user registration
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Check if username already exists
        const [results] = await db.query('SELECT * FROM users WHERE username = ?', [username]);

        if (results.length > 0) {
            return res.status(400).json({ success: false, message: 'Username already exists' });
        }

        // Hash the password before saving
        const hashedPassword = await bcrypt.hash(password, 10);

        await db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);

        res.status(201).json({ success: true, message: 'User registered successfully' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
});


// POST /login to handle user login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Query the database for the user using async/await
        const [results] = await db.query('SELECT * FROM users WHERE username = ?', [username]);

        if (results.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid username or password' });
        }

        const user = results[0];

        // Compare the password with the hashed password stored in the database
        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(401).json({ success: false, message: 'Invalid username or password' });
        }

        // Generate a JWT token for the user
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
            expiresIn: '1h' // Token expires in 1 hour
        });

        // Return the userId and token in the response
        res.json({ success: true, message: 'Login successful', userId: user.id, token });
    } catch (err) {
        console.error('Database query error:', err);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// GET /players to get players data
app.get('/players', async (req, res) => {
    const sql = `
        SELECT p.id, p.name AS name, position, proposedMarketValue, totalScore,
        appearances, teamId, t.name AS teamName
        FROM players p
        JOIN teams t ON t.id = p.teamId
        WHERE tournamentId = 626 AND position IS NOT NULL
        ORDER BY proposedMarketValue;
    `;

    // Mapping for position codes to descriptive labels
    const positionMapping = {
        F: 'FWD',
        M: 'MID',
        D: 'DEF',
        G: 'GK'
    };

    try {
        const [players] = await db.query(sql);

        // Find the minimum and maximum market values to normalize prices
        const proposedMarketValues = players.map(player => player.proposedMarketValue);
        const minMarketValue = Math.min(...proposedMarketValues);
        const maxMarketValue = Math.max(...proposedMarketValues);

        // Normalize each player's proposedMarketValue to the range [4, 11]
        players.forEach(player => {
            // Normalize the price
            const normalizedPrice = ((player.proposedMarketValue - minMarketValue) / (maxMarketValue - minMarketValue)) * (11 - 4) + 4;
            player.price = parseFloat(normalizedPrice.toFixed(1));

            // Map the position codes to the full names
            player.position = positionMapping[player.position] || player.position;
        });

        res.json(players);
    } catch (err) {
        console.error('Database query error:', err);
        return res.status(500).json({ error: 'Failed to fetch player data' });
    }
});

// get matchweek data, with matchweekStartTime = first game startTime - 2h
app.get('/matchweek/next', async (req, res) => {
    try {
        const [results] = await db.query(`
            SELECT round AS matchweek, MIN(startTime) AS matchweekStartTime FROM matches
            WHERE tournamentId = 626
            GROUP BY round
            HAVING MIN(startTime) > DATE_ADD(CURRENT_TIMESTAMP(), INTERVAL 2 HOUR)
            LIMIT 1
        `);
        
        if (results.length === 0) {
            return res.status(404).json({ error: 'No upcoming matches' });
        }
        
        const nextMatchweek = results[0];
        res.json(nextMatchweek);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /lineups/save to save lineups
app.post('/lineups/save', async (req, res) => {
    const { userId, matchweek, players } = req.body;

    if (!userId || !matchweek || !players) {
        return res.status(400).json({ success: false, message: 'Invalid data' });
    }

    const lineupValues = {
        FWD1: null, FWD2: null, FWD3: null, FWD4: null,
        MID1: null, MID2: null, MID3: null, MID4: null,
        DEF1: null, DEF2: null, DEF3: null, DEF4: null, DEF5: null,
        GK1: null, GK2: null
    };

    // Update lineupValues
    for (const [playerId, position] of Object.entries(players)) {
        if (lineupValues.hasOwnProperty(position)) {
            lineupValues[position] = playerId;
        }
    }

    const query = `
        INSERT INTO lineups (
            userId, matchweek,
            FWD1, FWD2, FWD3, FWD4,
            MID1, MID2, MID3, MID4, 
            DEF1, DEF2, DEF3, DEF4, DEF5,
            GK1, GK2,
            created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            FWD1 = VALUES(FWD1), FWD2 = VALUES(FWD2), FWD3 = VALUES(FWD3), FWD4 = VALUES(FWD4),
            MID1 = VALUES(MID1), MID2 = VALUES(MID2), MID3 = VALUES(MID3), MID4 = VALUES(MID4),
            DEF1 = VALUES(DEF1), DEF2 = VALUES(DEF2), DEF3 = VALUES(DEF3), DEF4 = VALUES(DEF4), DEF5 = VALUES(DEF5),
            GK1 = VALUES(GK1), GK2 = VALUES(GK2),
            created_at = VALUES(created_at)
    `;

    const lineupData = [
        userId,
        matchweek,
        lineupValues.FWD1, lineupValues.FWD2, lineupValues.FWD3, lineupValues.FWD4,
        lineupValues.MID1, lineupValues.MID2, lineupValues.MID3, lineupValues.MID4,
        lineupValues.DEF1, lineupValues.DEF2, lineupValues.DEF3, lineupValues.DEF4, lineupValues.DEF5,
        lineupValues.GK1, lineupValues.GK2,
        new Date() // created_at
    ];

    // Insert the data into the database
    try {
        await db.execute(query, lineupData);
        res.json({ success: true, message: 'Lineup saved successfully' });
    } catch (error) {
        console.error('Error saving lineup:', error);
        res.status(500).json({ success: false, message: 'Error saving lineup' });
    }
});

// GET /lineup with 2 parameters to get lineups
app.get('/lineup/userId/:userId/matchweek/:matchweek', async (req, res) => {
    const { userId, matchweek } = req.params;

    if (!userId || !matchweek) {
        return res.status(400).json({ success: false, message: 'Invalid userId or matchweek' });
    }

    const query = `
        SELECT 
            FWD1, FWD2, FWD3, FWD4,
            MID1, MID2, MID3, MID4, 
            DEF1, DEF2, DEF3, DEF4, DEF5,
            GK1, GK2
        FROM lineups
        WHERE userId = ? AND matchweek = ?
    `;

    try {
        const [results] = await db.query(query, [userId, matchweek]);

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Lineup not found' });
        }

        res.json({ success: true, lineup: results[0] });
    } catch (error) {
        console.error('Error fetching lineup:', error);
        res.status(500).json({ success: false, message: 'Error fetching lineup' });
    }
});

// GET /matchweek/${matchweek}/stats to get all players for a matchId
app.get('/matchweek/:matchweek/stats', async (req, res) => {
    const { matchweek } = req.params;

    if (!matchweek) {
        return res.status(400).json({ success: false, message: 'Invalid matchweek' });
    }

    const query = `
        SELECT
            ps.playerId, matchweekScore
        FROM player_statistics ps
        JOIN matches m ON m.id = ps.matchId
        JOIN players p ON p.id = ps.playerId
        WHERE m.round = ?`
    ;

    try {
        const [players] = await db.query(query, [matchweek]);

        if (players.length === 0) {
            return res.status(404).json({ success: false, message: 'Stats not found' });
        }

        res.json({ success: true, players: players });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ success: false, message: 'Error fetching stats' });
    }

    db.execute(query, [matchweek], (err, results) => {
        if (err) {
            console.error('Error fetching data: ', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'No players found for the specified match' });
        }

        return res.json(results);
    });
});

// GET /matchweek/${matchweek}/fixtures to get all fixtures in a matchweek
app.get('/matchweek/:matchweek/fixtures', async (req, res) => {
    const matchweek = req.params.matchweek || 1;
    const query = `
        SELECT m.id, status_code,
        homeTeamId, awayTeamId, t1.name homeTeam, t2.name awayTeam,
        homeScore_current, awayScore_current, startTime
        FROM matches m
        JOIN teams t1 ON t1.id = m.homeTeamId
        JOIN teams t2 ON t2.id = m.awayTeamId
        WHERE round = ?
        AND m.tournamentId = 626
        ORDER BY startTime`;
    try {
        const results = await db.query(query, [matchweek]);
        res.json(results[0]);
    } catch (error) {
        console.error('Error fetching fixtures:', error);
        res.status(500).send('Internal Server Error');
    }
});

// GET /matchweek/${matchweek}/stats to get all players for a matchId
app.get('/matchweek/:matchweek/stats/:playerId', async (req, res) => {
    const { matchweek, playerId } = req.params;

    if (!matchweek || !playerId) {
        return res.status(400).json({ success: false, message: 'Invalid matchweek or playerId' });
    }

    const query = `
        SELECT
            ps.playerId, ps.matchId, rating, minutesPlayed,
            goals, goalAssist, penaltyWon, penaltyMiss,
            penaltySave, penaltyConceded, ownGoals, saves,
            yellowCards, redCards, goalsConceded, matchweekScore
        FROM player_statistics ps
        JOIN matches m ON m.id = ps.matchId
        JOIN players p ON p.id = ps.playerId
        WHERE m.round = ?`
    ;

    try {
        const [players] = await db.query(query, [matchweek]);

        if (players.length === 0) {
            return res.status(404).json({ success: false, message: 'Stats not found' });
        }

        res.json({ success: true, players: players });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ success: false, message: 'Error fetching stats' });
    }

    db.execute(query, [matchweek], (err, results) => {
        if (err) {
            console.error('Error fetching data: ', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'No players found for the specified match' });
        }

        return res.json(results);
    });
});

// Start the server
app.listen(port, () => {
	console.log(`Server running at http://localhost:${port}`);
});
