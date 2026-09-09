// Load data from localStorage
function loadData() {
    const stored = localStorage.getItem('identityVMatches');
    return stored ? JSON.parse(stored) : [];
}

// Save data to localStorage
function saveData(matches) {
    localStorage.setItem('identityVMatches', JSON.stringify(matches));
}

// Calculate statistics
function calculateStats(matches) {
    const total = matches.length;
    const wins = matches.filter(m => m.won).length;
    const losses = total - wins;
    const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : 0;
    const avgDuration = total > 0 ? (matches.reduce((sum, m) => sum + m.duration_minutes, 0) / total).toFixed(1) : 0;

    return { total, wins, losses, winRate, avgDuration };
}

// Calculate stats by character
function getCharacterStats(matches) {
    const stats = {};
    matches.forEach(m => {
        if (!stats[m.character]) {
            stats[m.character] = { wins: 0, total: 0 };
        }
        stats[m.character].total++;
        if (m.won) stats[m.character].wins++;
    });

    return Object.entries(stats).map(([char, data]) => ({
        character: char,
        wins: data.wins,
        total: data.total,
        winRate: ((data.wins / data.total) * 100).toFixed(1)
    })).sort((a, b) => b.winRate - a.winRate);
}

// Calculate stats by map
function getMapStats(matches) {
    const stats = {};
    matches.forEach(m => {
        if (!stats[m.map]) {
            stats[m.map] = { wins: 0, total: 0 };
        }
        stats[m.map].total++;
        if (m.won) stats[m.map].wins++;
    });

    return Object.entries(stats).map(([map, data]) => ({
        map: map,
        wins: data.wins,
        total: data.total,
        winRate: ((data.wins / data.total) * 100).toFixed(1)
    })).sort((a, b) => b.winRate - a.winRate);
}

// Render overall stats
function renderStats(matches) {
    const { total, wins, winRate, avgDuration } = calculateStats(matches);
    document.getElementById('totalMatches').textContent = total;
    document.getElementById('totalWins').textContent = wins;
    document.getElementById('winRate').textContent = winRate + '%';
    document.getElementById('avgDuration').textContent = avgDuration + ' min';
}

// Render character stats
function renderCharacterStats(matches) {
    const charStats = getCharacterStats(matches);
    const container = document.getElementById('characterStats');
    container.innerHTML = charStats.map(stat => `
        <div class="stat-item">
            <strong>${stat.character}</strong>
            <div class="rate">${stat.winRate}%</div>
            <small>${stat.wins}W / ${stat.total}L</small>
        </div>
    `).join('');
}

// Render map stats
function renderMapStats(matches) {
    const mapStats = getMapStats(matches);
    const container = document.getElementById('mapStats');
    container.innerHTML = mapStats.map(stat => `
        <div class="stat-item">
            <strong>${stat.map}</strong>
            <div class="rate">${stat.winRate}%</div>
            <small>${stat.wins}W / ${stat.total}L</small>
        </div>
    `).join('');
}

// Render match history table
function renderMatchTable(matches) {
    const tbody = document.getElementById('matchBody');
    tbody.innerHTML = [...matches].reverse().map(m => `
        <tr>
            <td>${m.date}</td>
            <td>${m.character}</td>
            <td>${m.map}</td>
            <td>${m.role.charAt(0).toUpperCase() + m.role.slice(1)}</td>
            <td class="result-${m.won ? 'win' : 'loss'}">${m.won ? 'Win' : 'Loss'}</td>
            <td>${m.duration_minutes} min</td>
            <td>${m.notes || '-'}</td>
        </tr>
    `).join('');
}

// Render all data
function renderAll(matches) {
    renderStats(matches);
    renderCharacterStats(matches);
    renderMapStats(matches);
    renderMatchTable(matches);
}

// Handle form submission
document.getElementById('matchForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const match = {
        id: Date.now(),
        date: document.getElementById('date').value,
        character: document.getElementById('character').value,
        map: document.getElementById('map').value,
        role: document.getElementById('role').value,
        won: document.getElementById('result').value === 'true',
        duration_minutes: parseInt(document.getElementById('duration').value),
        notes: document.getElementById('notes').value
    };

    const matches = loadData();
    matches.push(match);
    saveData(matches);
    renderAll(matches);

    // Reset form
    this.reset();
    document.getElementById('date').valueAsDate = new Date();
});

// Initialize on page load
window.addEventListener('DOMContentLoaded', function() {
    // Set today's date as default
    document.getElementById('date').valueAsDate = new Date();
    
    const matches = loadData();
    renderAll(matches);
});