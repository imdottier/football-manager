const db = require('./db');

// Calc score for all matches
const calculateAllMatchweekScores = async () => {
    try {
        console.log('Calculating scores...\n');

        // convert from ms to s
        const query = `
            SELECT
                ps.playerId, ps.matchId, rating, minutesPlayed,
                goals, goalAssist, penaltyWon, penaltyMiss,
                penaltySave, penaltyConceded, ownGoals, saves,
                yellowCards, redCards, goalsConceded,
                p.position
            FROM player_statistics ps
            JOIN matches m ON m.id = ps.matchId
            JOIN players p ON p.id = ps.playerId
        `;

        const [players] = await db.query(query);

        if (players.length === 0) {
            console.log('No stats need updating at this time.\n');
            return;
        }

        // Insert matchweekScore to player_statistics
        const insertQuery = `
            INSERT INTO player_statistics (
                playerId,
                matchId,    
                matchweekScore
            ) VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE
                matchweekScore = VALUES(matchweekScore)
        `;
        
        for (const player of players) {
            let matchweekScore = 0;
            const position = player.position;

            const minutesPlayed = player.minutesPlayed;
            if (minutesPlayed >= 60) {
                matchweekScore += 2;  // Award 2 points for 60+ minutes
            } else if (minutesPlayed > 0) {
                matchweekScore += 1;  // Award 1 point for >0 minutes
            }

            const goalCount = player.goals;
            if (position === 'F') {
                matchweekScore += 4 * goalCount;  // 4 points for each FWD goal
            } else if (position === 'M') {
                matchweekScore += 5 * goalCount;  // 5 points for each MID goal
            } else if (position === 'D') {
                matchweekScore += 6 * goalCount;  // 6 points for each DEF goal
            } else if (position === 'G') {
                matchweekScore += 10 * goalCount;  // 10 points for each GK goal
            }

            const assistCount = player.goalAssist;
            matchweekScore += 4 * assistCount;  // 3 points for each assist
            
            const goalsConceded = player.goalsConceded;
            if (position === 'G' || position === 'D') {
                if (player.goalsConceded === 0) {
                    matchweekScore += 4; // 4 points for GK / DEF clean sheet
                } else {
                    matchweekScore -= Math.floor(goalsConceded / 2); // -1 point for every 2 goals conceded
                }
            } else if (position === 'M') {
                if (player.goalsConceded === 0) {
                    matchweekScore += 1; // 1 point for MID clean sheet
                }
            }

            if (position === 'G') {
                matchweekScore += Math.floor(player.saves / 3); // 1 point for every 3 GK saves
                matchweekScore += 5 * player.penaltySave; // 5 points for every penalty save
            }

            matchweekScore -= 2 * player.penaltyMiss; // -2 points for every penalty miss
            matchweekScore += 2 * player.penaltyWon; // 2 points for every penalty won by player
            matchweekScore -= 1 * player.penaltyConceded; // -1 point for every penalty caused by player

            matchweekScore -= 2 * player.ownGoals; // -2 points for every own goal
            
            matchweekScore -= 1 * player.yellowCards; // -1 point for 1 yellow card, -2 for double yellow -> red
            matchweekScore -= 3 * player.redCards; // -3 point for a straight red card

            try {
                await db.execute(insertQuery, [player.playerId, player.matchId, matchweekScore]);
            } catch (error) {
                console.error('Error saving stats:', error);
            }
        }

        console.log('\nAll stats updated.\n');
    } catch (error) {
        console.error('Error updating stats:', error);
    }
};

// Calc score for matches up to 48h after startTime
const calculateRecentMatchweekScores = async () => {
    try {
        console.log('Calculating scores...\n');

        const fortyEightHoursAgo = Date.now() - 48 * 60 * 60 * 1000;

        // convert from ms to s
        const query = `
            SELECT
                ps.playerId, ps.matchId, rating, minutesPlayed,
                goals, goalAssist, penaltyWon, penaltyMiss,
                penaltySave, penaltyConceded, ownGoals, saves,
                yellowCards, redCards, goalsConceded,
                p.position
            FROM player_statistics ps
            JOIN matches m ON m.id = ps.matchId
            JOIN players p ON p.id = ps.playerId
            WHERE UNIX_TIMESTAMP(m.startTime) * 1000 > ?
        `;

        const [players] = await db.query(query, [fortyEightHoursAgo]);

        if (players.length === 0) {
            console.log('No stats need updating at this time.\n');
            return;
        }

        // Insert matchweekScore to player_statistics
        const insertQuery = `
            INSERT INTO player_statistics (
                playerId,
                matchId,    
                matchweekScore
            ) VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE
                matchweekScore = VALUES(matchweekScore)
        `;
        
        for (const player of players) {
            let matchweekScore = 0;
            const position = player.position;

            const minutesPlayed = player.minutesPlayed;
            if (minutesPlayed >= 60) {
                matchweekScore += 2;  // Award 2 points for 60+ minutes
            } else if (minutesPlayed > 0) {
                matchweekScore += 1;  // Award 1 point for >0 minutes
            }

            const goalCount = player.goals;
            if (position === 'F') {
                matchweekScore += 4 * goalCount;  // 4 points for each FWD goal
            } else if (position === 'M') {
                matchweekScore += 5 * goalCount;  // 5 points for each MID goal
            } else if (position === 'D') {
                matchweekScore += 6 * goalCount;  // 6 points for each DEF goal
            } else if (position === 'G') {
                matchweekScore += 10 * goalCount;  // 10 points for each GK goal
            }

            const assistCount = player.goalAssist;
            matchweekScore += 4 * assistCount;  // 3 points for each assist
            
            const goalsConceded = player.goalsConceded;
            if (position === 'G' || position === 'D') {
                if (player.goalsConceded === 0) {
                    matchweekScore += 4; // 4 points for GK / DEF clean sheet
                } else {
                    matchweekScore -= Math.floor(goalsConceded / 2); // -1 point for every 2 goals conceded
                }
            } else if (position === 'M') {
                if (player.goalsConceded === 0) {
                    matchweekScore += 1; // 1 point for MID clean sheet
                }
            }

            if (position === 'G') {
                matchweekScore += Math.floor(player.saves / 3); // 1 point for every 3 GK saves
                matchweekScore += 5 * player.penaltySave; // 5 points for every penalty save
            }

            matchweekScore -= 2 * player.penaltyMiss; // -2 points for every penalty miss
            matchweekScore += 2 * player.penaltyWon; // 2 points for every penalty won by player
            matchweekScore -= 1 * player.penaltyConceded; // -1 point for every penalty caused by player

            matchweekScore -= 2 * player.ownGoals; // -2 points for every own goal
            
            matchweekScore -= 1 * player.yellowCards; // -1 point for 1 yellow card, -2 for double yellow -> red
            matchweekScore -= 3 * player.redCards; // -3 point for a straight red card

            try {
                await db.execute(insertQuery, [player.playerId, player.matchId, matchweekScore]);
            } catch (error) {
                console.error('Error saving stats:', error);
            }
        }

        console.log('\nRecent stats updated.\n');
    } catch (error) {
        console.error('Error updating stats:', error);
    }
};

// Calc score for all matches
const updateAllTotalStats = async () => {
    try {
        console.log('Calculating stats...\n');

        // convert from ms to s
        const query = `
            select p.id, COUNT(ps.matchweekScore) AS appearances,
            SUM(ps.matchweekScore) AS totalScore
            from players p
            join player_statistics ps ON ps.playerId = p.id
            GROUP BY p.id
        `;

        const [players] = await db.query(query);

        if (players.length === 0) {
            console.log('No stats need updating at this time.\n');
            return;
        }

        // Insert appearances and totalScore to players
        const insertQuery = `
            INSERT INTO players (
                id,
                appearances,
                totalScore
            ) VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE
                appearances = VALUES(appearances),
                totalScore = VALUES(totalScore)
        `;
        
        for (const player of players) {
            try {
                await db.execute(insertQuery, [player.id, player.appearances, player.totalScore]);
            } catch (error) {
                console.error('Error saving stats:', error);
            }
        }
        console.log('\nAll stats updated.\n');
    } catch (error) {
        console.error('Error updating stats:', error);
    }
};

module.exports = { calculateAllMatchweekScores, calculateRecentMatchweekScores, updateAllTotalStats }