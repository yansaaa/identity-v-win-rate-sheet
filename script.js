const STORAGE_KEY = 'identityVMatches';
const PAGE_SIZE = 25;
let currentPage = 1;
let matches = [];

const $ = (id) => document.getElementById(id);

function normalizeMatch(value) {
    if (!value || typeof value !== 'object') return null;
    const duration = Number(value.duration_minutes);
    const date = typeof value.date === 'string' ? value.date : '';
    const character = typeof value.character === 'string' ? value.character.trim() : '';
    const map = typeof value.map === 'string' ? value.map.trim() : '';
    const role = value.role === 'hunter' || value.role === 'survivor' ? value.role : '';
    if (!date || !character || !map || !role || !Number.isFinite(duration) || duration < 1) return null;
    return {
        id: Number.isFinite(Number(value.id)) ? Number(value.id) : Date.now(),
        date, character, map, role, won: value.won === true,
        duration_minutes: Math.round(duration),
        notes: typeof value.notes === 'string' ? value.notes.trim().slice(0, 200) : ''
    };
}

function loadData() {
    try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        return Array.isArray(stored) ? stored.map(normalizeMatch).filter(Boolean) : [];
    } catch (error) {
        console.warn('Could not load saved matches.', error);
        return [];
    }
}

function saveData(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
        console.warn('Could not save matches.', error);
    }
}

function createBucket() { return { wins: 0, total: 0, durationSum: 0 }; }

function aggregateStats(data) {
    const overall = { total: 0, wins: 0, durationSum: 0 };
    const characters = new Map();
    const maps = new Map();
    data.forEach((match) => {
        const duration = match.duration_minutes;
        overall.total += 1;
        overall.wins += match.won ? 1 : 0;
        overall.durationSum += duration;
        [[characters, match.character], [maps, match.map]].forEach(([group, key]) => {
            const bucket = group.get(key) || createBucket();
            bucket.total += 1;
            bucket.wins += match.won ? 1 : 0;
            bucket.durationSum += duration;
            group.set(key, bucket);
        });
    });
    return { overall, characters, maps };
}

function displayStats(stats, keyName) {
    return [...stats.entries()].map(([key, data]) => ({
        [keyName]: key, ...data, losses: data.total - data.wins,
        winRate: data.total ? (data.wins / data.total) * 100 : 0
    })).sort((a, b) => b.winRate - a.winRate || b.total - a.total);
}

function renderStats(overall) {
    $('totalMatches').textContent = overall.total;
    $('totalWins').textContent = overall.wins;
    $('winRate').textContent = `${overall.total ? ((overall.wins / overall.total) * 100).toFixed(1) : '0.0'}%`;
    $('avgDuration').textContent = `${overall.total ? (overall.durationSum / overall.total).toFixed(1) : '0.0'} min`;
}

function renderGroupStats(containerId, stats, keyName) {
    const container = $(containerId);
    container.replaceChildren();
    const values = displayStats(stats, keyName);
    if (!values.length) { container.textContent = 'No matches recorded yet.'; return; }
    const fragment = document.createDocumentFragment();
    values.forEach((stat) => {
        const item = document.createElement('div'); item.className = 'stat-item';
        const name = document.createElement('strong'); name.textContent = stat[keyName];
        const rate = document.createElement('div'); rate.className = 'rate'; rate.textContent = `${stat.winRate.toFixed(1)}%`;
        const record = document.createElement('small'); record.textContent = `${stat.wins}W / ${stat.losses}L`;
        item.append(name, rate, record); fragment.appendChild(item);
    });
    container.appendChild(fragment);
}

function addCell(row, text, className = '') {
    const cell = document.createElement('td'); cell.textContent = text;
    if (className) cell.className = className;
    row.appendChild(cell);
}

function renderMatchTable(data) {
    const sorted = [...data].sort((a, b) => b.id - a.id);
    const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    currentPage = Math.min(Math.max(currentPage, 1), totalPages);
    const pageMatches = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    const body = $('matchBody'); body.replaceChildren();
    pageMatches.forEach((match) => {
        const row = document.createElement('tr');
        addCell(row, match.date); addCell(row, match.character); addCell(row, match.map);
        addCell(row, match.role.charAt(0).toUpperCase() + match.role.slice(1));
        addCell(row, match.won ? 'Win' : 'Loss', `result-${match.won ? 'win' : 'loss'}`);
        addCell(row, `${match.duration_minutes} min`); addCell(row, match.notes || '-'); body.appendChild(row);
    });
    $('pagination').hidden = sorted.length === 0;
    $('pageInfo').textContent = `Page ${currentPage} of ${totalPages}`;
    $('previousPage').disabled = currentPage === 1;
    $('nextPage').disabled = currentPage === totalPages;
}

function renderAll() {
    const { overall, characters, maps } = aggregateStats(matches);
    renderStats(overall); renderGroupStats('characterStats', characters, 'character');
    renderGroupStats('mapStats', maps, 'map'); renderMatchTable(matches);
}

function showFormError(message = '') { $('formError').textContent = message; $('formError').hidden = !message; }

function handleSubmit(event) {
    event.preventDefault(); showFormError();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const match = normalizeMatch({
        id: Date.now(), date: $('date').value, character: $('character').value,
        map: $('map').value, role: $('role').value, won: $('result').value === 'true',
        duration_minutes: $('duration').value, notes: $('notes').value
    });
    if (!match) { showFormError('Please enter valid match details.'); return; }
    matches.push(match); saveData(matches); currentPage = 1; renderAll();
    form.reset(); $('date').valueAsDate = new Date(); $('character').focus();
}

document.addEventListener('DOMContentLoaded', () => {
    matches = loadData(); $('date').valueAsDate = new Date();
    $('matchForm').addEventListener('submit', handleSubmit);
    $('previousPage').addEventListener('click', () => { currentPage -= 1; renderMatchTable(matches); });
    $('nextPage').addEventListener('click', () => { currentPage += 1; renderMatchTable(matches); });
    renderAll();
});
