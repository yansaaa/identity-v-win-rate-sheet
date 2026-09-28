// Load data from localStorage
function loadData() {
    const stored = localStorage.getItem('identityVMatches');
    return stored ? JSON.parse(stored) : [];
}

// Save data to localStorage
function saveData(matches) {
    localStorage.setItem('identityVMatches', JSON.stringify(matches));
}

const PAGE_SIZE = 25;
let currentPage = 1;

// Create a stats bucket for a character or map.
function createBucket() {
    return { wins: 0, total: 0, durationSum: 0, lastUpdated: null };
}

// Calculate all statistics in one pass through the matches array.
function aggregateStats(matches) {
    const overall = {
        total: 0,
        wins: 0,
        durationSum: 0,
        lastUpdated: null
    };
    const characters = new Map();
    const maps = new Map();

    for (const match of matches) {
        const duration = Number(match.duration_minutes) || 0;
        const updatedAt = match.id || match.date || null;

        overall.total++;
        overall.wins += match.won ? 1 : 0;
        overall.durationSum += duration;
        if (updatedAt && (!overall.lastUpdated || updatedAt > overall.lastUpdated)) {
            overall.lastUpdated = updatedAt;
        }

        const groups = [
            [characters, match.character],
            [maps, match.map]
        ];

        for (const [group, key] of groups) {
            if (!group.has(key)) {
                group.set(key, createBucket());
            }

            const bucket = group.get(key);
            bucket.total++;
            bucket.wins += match.won ? 1 : 0;
            bucket.durationSum += duration;
            if (updatedAt && (!bucket.lastUpdated || updatedAt > bucket.lastUpdated)) {
                bucket.lastUpdated = updatedAt;
            }
        }
    }

    return { overall, characters, maps };
}

function toDisplayStats(stats, keyName) {
    return [...stats.entries()]
        .map(([key, data]) => ({
            [keyName]: key,
            wins: data.wins,
            total: data.total,
            losses: data.total - data.wins,
            durationSum: data.durationSum,
            lastUpdated: data.lastUpdated,
            winRate: data.total > 0 ? (data.wins / data.total) * 100 : 0
        }))
        .sort((a, b) => b.winRate - a.winRate);
}

// Render overall stats
function renderStats(overall) {
    const { total, wins, durationSum } = overall;
    const winRate = total > 0 ? (wins / total) * 100 : 0;
    const avgDuration = total > 0 ? durationSum / total : 0;

    document.getElementById('totalMatches').textContent = total;
    document.getElementById('totalWins').textContent = wins;
    document.getElementById('winRate').textContent = winRate.toFixed(1) + '%';
    document.getElementById('avgDuration').textContent = avgDuration.toFixed(1) + ' min';
}

// Render character stats
function renderCharacterStats(stats) {
    const charStats = toDisplayStats(stats, 'character');
    const container = document.getElementById('characterStats');
    container.innerHTML = charStats.map(stat => `
        <div class="stat-item">
            <strong>${stat.character}</strong>
            <div class="rate">${stat.winRate.toFixed(1)}%</div>
            <small>${stat.wins}W / ${stat.losses}L</small>
        </div>
    `).join('');
}

// Render map stats
function renderMapStats(stats) {
    const mapStats = toDisplayStats(stats, 'map');
    const container = document.getElementById('mapStats');
    container.innerHTML = mapStats.map(stat => `
        <div class="stat-item">
            <strong>${stat.map}</strong>
            <div class="rate">${stat.winRate.toFixed(1)}%</div>
            <small>${stat.wins}W / ${stat.losses}L</small>
        </div>
    `).join('');
}

function renderPagination(totalMatches, totalPages) {
    const pagination = document.getElementById('pagination');
    const pageInfo = document.getElementById('pageInfo');
    const previousButton = document.getElementById('previousPage');
    const nextButton = document.getElementById('nextPage');

    pagination.hidden = totalMatches === 0;
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    previousButton.disabled = currentPage === 1;
    nextButton.disabled = currentPage === totalPages;
}

// Render only the current page of match history.
function renderMatchTable(matches) {
    const tbody = document.getElementById('matchBody');
    const sortedMatches = [...matches].reverse();
    const totalPages = Math.max(1, Math.ceil(sortedMatches.length / PAGE_SIZE));

    currentPage = Math.min(Math.max(currentPage, 1), totalPages);
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageMatches = sortedMatches.slice(start, start + PAGE_SIZE);

    tbody.innerHTML = pageMatches.map(m => `
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

    renderPagination(sortedMatches.length, totalPages);
}

// Render all data using the same aggregated result for every stats section.
function renderAll(matches) {
    const { overall, characters, maps } = aggregateStats(matches);
    renderStats(overall);
    renderCharacterStats(characters);
    renderMapStats(maps);
    renderMatchTable(matches);
}

// Handle pagination without recalculating statistics.
document.getElementById('previousPage').addEventListener('click', function() {
    if (currentPage > 1) {
        currentPage--;
        renderMatchTable(loadData());
    }
});

document.getElementById('nextPage').addEventListener('click', function() {
    const matches = loadData();
    const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));

    if (currentPage < totalPages) {
        currentPage++;
        renderMatchTable(matches);
    }
});

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
    currentPage = 1;
    renderAll(matches);

    // Reset form
    this.reset();
    document.getElementById('date').valueAsDate = new Date();
});

// Initialize on page load
window.addEventListener('DOMContentLoaded', function() {
    document.getElementById('date').valueAsDate = new Date();
    renderAll(loadData());
});
