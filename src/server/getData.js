const updateAllTeams = require('./db/importTeams');
const updatePlayersForAllTeams = require('./db/importPlayers');
const { updateAllMatches, updateRecentMatches } = require('./db/importMatches');
const { updateAllStats, updateRecentStats } = require('./db/importPlayerStats');
const { calculateAllMatchweekScores, calculateRecentMatchweekScores, updateAllTotalStats } = require('./db/calculateData');

const runAllUpdates = async () => {
    try {
        // Update team data immediately, then every 24 hours
        await updateAllTeams();

        setInterval(async () => {
            await updateAllTeams();
        }, 24 * 60 * 60 * 1000); // 24 hours


        // Update players for all teams immediately, then every 24 hours
        await updatePlayersForAllTeams();

        setInterval(async () => {
            await updatePlayersForAllTeams();
        }, 24 * 60 * 60 * 1000); // 24 hours


        // Update all fixtures immediately, then every 24 hours
        await updateAllMatches();
        setInterval(async () => {
            await updateAllMatches();
        }, 24 * 60 * 60 * 1000); // 24 hours

        // Update results of matches near current time every minute
        setInterval(async () => {
            await updateRecentMatches();
        }, 60 * 1000); // 1 minute


        // Update all stats immediately, then every 24 hours
        await updateAllStats();
        setInterval(async () => {
            await updateAllStats();
        }, 24 * 60 * 60 * 1000); // 24 hours

        // Update stats of matches near current time every hour
        setInterval(async () => {
            await updateRecentStats();
        }, 60 * 60 * 1000); // 1 hour


        // Calculate all data immediately
        await calculateAllMatchweekScores();

        // then calculate recent data every minute
        setInterval(async () => {
            await calculateRecentMatchweekScores();
        }, 60 * 1000); // 1 min

        // Update individual total stats immediately, then every hour
        await updateAllTotalStats();
        setInterval(async () => {
            await updateAllTotalStats();
        }, 60 * 60 * 1000); // 1 hour

        console.log('All updates scheduled successfully.\n');
    } catch (error) {
        console.error('Error running updates:', error);
    }
};

module.exports = runAllUpdates;

// runAllUpdates();
