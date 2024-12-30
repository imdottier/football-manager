const url = 'http://localhost:3000';

let currentUserId;

let players = {};

// Object to track player states: ID -> position
// 3 states: canBeChosen, alreadyOnField, and noSlotsAvailable
const playerStates = {};

// Track the sort order for each column (null: no sort, true: ascending, false: descending)
let sortOrder = [true, true, true, true]; 
let currentMatchweek;

let displayMatchweek;

// section 1
let totalBudget = 100.0; // Starting budget
let selectedPlayers = {}; // Track selected players
let totalCost = 0; // Total cost of selected players
let totalScore = 0; // Total matchweek score of selected players

let isSignedIn = false;

// Call the function to fetch matchweek data when the page loads
window.onload = async function() {
    await getMatchweek(); // Call the function when the window has finished loading
    displayMatchweek = currentMatchweek;
    fetchMatchweekScores(currentMatchweek);
};

let currentPage = 'fantasy';

// load fantasy, fixture, about homescreen
// should be updated later
function loadPage(page) {
    // Hide all pages
    const pages = document.querySelectorAll('[id$="Page"]');
    pages.forEach(pageElement => pageElement.classList.add('hidden'));

    if (page === 'fantasy') {
        displayMatchweek = currentMatchweek;
        loadLineup(currentUserId, currentMatchweek);

        document.getElementById('currentMatchweekPage').classList.remove('hidden');
        document.getElementById('lineupsPage').classList.remove('hidden');
        document.getElementById('selectPlayerPage').classList.remove('hidden');
        document.getElementById('saveTeamPage').classList.remove('hidden');
    } else if (page === 'fixture') {
        displayMatchweek = currentMatchweek;
        loadFixtures(displayMatchweek);
        updateMatchweek();

        document.getElementById('matchweekDisplayPage').classList.remove('hidden');
        document.getElementById('fixturePage').classList.remove('hidden');
    } else if (page === 'about') {
        document.getElementById('aboutPage').classList.remove('hidden');
    } else if (page === 'previousLineup') {
        displayMatchweek = currentMatchweek - 1;
        loadFixtures(displayMatchweek);
        updateMatchweek();

        loadLineup(currentUserId, displayMatchweek);

        document.getElementById('totalScorePage').classList.remove('hidden');
        document.getElementById('matchweekDisplayPage').classList.remove('hidden');
        document.getElementById('lineupsPage').classList.remove('hidden');
        document.getElementById('selectPlayerPage').classList.remove('hidden');
    }
}




