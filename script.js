const STORAGE_KEY = 'identityVMatches';
const THEME_KEY = 'theme-preference';
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

    const noteValue = typeof value.notes === 'string' ? value.notes.trim().slice(0, 200) : '';
    const wonValue = value.won === true || value.won === 'true';

    return {
        id: Number.isFinite(Number(value.id)) ? Number(value.id) : Date.now(),
        date,
        character,
        map,
        role,
        won: wonValue,
        duration_minutes: Math.round(duration),
        notes: noteValue
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

function getPreferredTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function setTheme(theme, persist = true) {
    document.documentElement.setAttribute('data-theme', theme);
    if (persist) localStorage.setItem(THEME_KEY, theme);
    const toggle = $('themeToggle');
    if (toggle) toggle.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    setTheme(current === 'dark' ? 'light' : 'dark');
}

function createBucket() {
    return { wins: 0, total: 0, durationSum: 0 };
}

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
    return [...stats.entries()]
        .map(([key, data]) => ({
            [keyName]: key,
            ...data,
            losses: data.total - data.wins,
            winRate: data.total ? (data.wins / data.total) * 100 : 0
        }))
        .sort((a, b) => b.winRate - a.winRate || b.total - a.total);
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

    if (!values.length) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.textContent = 'No matches recorded yet.';
        container.appendChild(empty);
        return;
    }

    const fragment = document.createDocumentFragment();
    values.forEach((stat) => {
        const item = document.createElement('div');
        item.className = 'stat-item';

        const name = document.createElement('strong');
        name.textContent = stat[keyName];

        const rate = document.createElement('div');
        rate.className = 'rate';
        rate.textContent = `${stat.winRate.toFixed(1)}%`;

        const record = document.createElement('small');
        record.textContent = `${stat.wins}W / ${stat.losses}L`;

        item.append(name, rate, record);
        fragment.appendChild(item);
    });

    container.appendChild(fragment);
}

function addCell(row, text, className = '') {
    const cell = document.createElement('td');
    cell.textContent = text;
    if (className) cell.className = className;
    row.appendChild(cell);
}

function renderMatchTable(data) {
    const sorted = [...data].sort((a, b) => b.id - a.id);
    const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    currentPage = Math.min(Math.max(currentPage, 1), totalPages);
    const pageMatches = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    const body = $('matchBody');
    body.replaceChildren();

    pageMatches.forEach((match) => {
        const row = document.createElement('tr');
        addCell(row, match.date);
        addCell(row, match.character);
        addCell(row, match.map);
        addCell(row, match.role.charAt(0).toUpperCase() + match.role.slice(1));
        addCell(row, match.won ? 'Win' : 'Loss', `result-${match.won ? 'win' : 'loss'}`);
        addCell(row, `${match.duration_minutes} min`);
        addCell(row, match.notes || '-');
        body.appendChild(row);
    });

    $('pagination').hidden = sorted.length === 0;
    $('pageInfo').textContent = `Page ${currentPage} of ${totalPages}`;
    $('previousPage').disabled = currentPage === 1;
    $('nextPage').disabled = currentPage === totalPages;
}

function renderAll() {
    const { overall, characters, maps } = aggregateStats(matches);
    renderStats(overall);
    renderGroupStats('characterStats', characters, 'character');
    renderGroupStats('mapStats', maps, 'map');
    renderMatchTable(matches);
}

function showFormError(message = '') {
    const error = $('formError');
    error.textContent = message;
    error.hidden = !message;
}

function showDataMessage(message = '') {
    const messageBox = $('dataMessage');
    if (!messageBox) return;
    messageBox.textContent = message;
    messageBox.hidden = !message;
}

function handleSubmit(event) {
    event.preventDefault();
    showFormError();

    const form = event.currentTarget;
    if (!form.reportValidity()) return;

    const match = normalizeMatch({
        id: Date.now(),
        date: $('date').value,
        character: $('character').value,
        map: $('map').value,
        role: $('role').value,
        won: $('result').value === 'true',
        duration_minutes: $('duration').value,
        notes: $('notes').value
    });

    if (!match) {
        showFormError('Please enter valid match details.');
        return;
    }

    matches.push(match);
    saveData(matches);
    currentPage = 1;
    showDataMessage('Match added successfully.');
    renderAll();

    form.reset();
    $('date').valueAsDate = new Date();
    $('character').focus();
}

function escapeCsv(value) {
    const result = String(value ?? '').replace(/"/g, '""');
    return result.includes(',') || result.includes('"') || result.includes('\n') ? `"${result}"` : result;
}

function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportJson() {
    const timestamp = new Date().toISOString().slice(0, 10);
    downloadFile(`identity-v-matches-${timestamp}.json`, JSON.stringify(matches, null, 2), 'application/json');
    showDataMessage('Match history exported as JSON.');
}

function exportCsv() {
    const header = ['date', 'character', 'map', 'role', 'won', 'duration_minutes', 'notes'];
    const rows = matches.map((match) => [
        match.date,
        match.character,
        match.map,
        match.role,
        match.won ? 'true' : 'false',
        match.duration_minutes,
        match.notes
    ]);

    const csvContent = [header, ...rows]
        .map((row) => row.map(escapeCsv).join(','))
        .join('\n');

    const timestamp = new Date().toISOString().slice(0, 10);
    downloadFile(`identity-v-matches-${timestamp}.csv`, csvContent, 'text/csv;charset=utf-8;');
    showDataMessage('Match history exported as CSV.');
}

function parseCsvRow(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i += 1;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    result.push(current.trim());
    return result;
}

function importCsv(csvText) {
    const lines = csvText.split(/\r?\n/).filter((line) => line.trim() !== '');
    if (lines.length < 2) {
        throw new Error('CSV file must include a header row and at least one match.');
    }

    const header = parseCsvRow(lines[0]).map((value) => value.toLowerCase().trim());
    const expected = ['date', 'character', 'map', 'role', 'won', 'duration_minutes', 'notes'];
    const missing = expected.filter((key) => !header.includes(key));
    if (missing.length) {
        throw new Error(`CSV is missing required columns: ${missing.join(', ')}`);
    }

    const imported = lines.slice(1).map((line) => {
        const values = parseCsvRow(line);
        const row = {};
        header.forEach((key, index) => {
            row[key] = values[index] ?? '';
        });
        return normalizeMatch({
            id: Date.now() + Math.random(),
            date: row.date,
            character: row.character,
            map: row.map,
            role: row.role,
            won: row.won === 'true' || row.won === 'True',
            duration_minutes: row.duration_minutes,
            notes: row.notes || ''
        });
    }).filter(Boolean);

    if (!imported.length) {
        throw new Error('No valid matches were found in the CSV file.');
    }

    matches = imported;
    saveData(matches);
    currentPage = 1;
    renderAll();
    showDataMessage(`Imported ${imported.length} match${imported.length === 1 ? '' : 'es'} from CSV.`);
}

function importJson(jsonText) {
    const parsed = JSON.parse(jsonText);
    if (!Array.isArray(parsed)) {
        throw new Error('JSON file must contain an array of matches.');
    }

    const imported = parsed.map(normalizeMatch).filter(Boolean);
    if (!imported.length) {
        throw new Error('No valid matches were found in the JSON file.');
    }

    matches = imported;
    saveData(matches);
    currentPage = 1;
    renderAll();
    showDataMessage(`Imported ${imported.length} match${imported.length === 1 ? '' : 'es'} from JSON.`);
}

function handleImport(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        try {
            const text = String(reader.result || '');
            const lower = file.name.toLowerCase();
            if (lower.endsWith('.csv')) {
                importCsv(text);
            } else {
                importJson(text);
            }
        } catch (error) {
            console.error(error);
            showDataMessage(error.message || 'Import failed.');
        }
    };

    reader.onerror = () => {
        showDataMessage('Could not read the selected file.');
    };

    reader.readAsText(file);
}

function clearAllData() {
    if (!matches.length) {
        showDataMessage('There are no saved matches to clear.');
        return;
    }

    const confirmed = window.confirm('Delete all saved matches? This cannot be undone.');
    if (!confirmed) return;

    matches = [];
    saveData(matches);
    renderAll();
    showDataMessage('All match history has been cleared.');
}

document.addEventListener('DOMContentLoaded', () => {
    setTheme(getPreferredTheme(), false);

    const themeToggle = $('themeToggle');
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);

    matches = loadData();
    $('date').valueAsDate = new Date();

    $('matchForm').addEventListener('submit', handleSubmit);
    $('previousPage').addEventListener('click', () => { currentPage -= 1; renderMatchTable(matches); });
    $('nextPage').addEventListener('click', () => { currentPage += 1; renderMatchTable(matches); });
    $('exportJsonBtn').addEventListener('click', exportJson);
    $('exportCsvBtn').addEventListener('click', exportCsv);
    $('resetDataBtn').addEventListener('click', clearAllData);
    $('importFile').addEventListener('change', (event) => {
        const [file] = event.target.files;
        handleImport(file);
        event.target.value = '';
    });

    renderAll();
});

if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
        if (!localStorage.getItem(THEME_KEY)) {
            setTheme(event.matches ? 'dark' : 'light', false);
        }
    });
}
