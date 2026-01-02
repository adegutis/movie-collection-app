const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

const moviesPath = path.join(config.dataDir, 'movies.json');
const backupsDir = path.join(config.dataDir, 'backups');

let moviesCache = null;

// Security: Validation allowlists
const ALLOWED_SORT_FIELDS = ['title', 'format', 'genre', 'releaseDate', 'actors', 'notes', 'dateAdded', 'dateModified'];
const ALLOWED_FORMATS = ['dvd', 'bluray', '4k', 'mixed', 'bluray_4k'];
const ALLOWED_UPGRADE_TARGETS = ['4k', 'bluray', null];

function ensureDirectories() {
  if (!fs.existsSync(config.dataDir)) {
    fs.mkdirSync(config.dataDir, { recursive: true });
  }
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }
}

function loadMovies() {
  ensureDirectories();

  if (moviesCache) {
    return moviesCache;
  }

  if (!fs.existsSync(moviesPath)) {
    moviesCache = {
      version: '1.0',
      lastModified: new Date().toISOString(),
      movies: []
    };
    return moviesCache;
  }

  const data = fs.readFileSync(moviesPath, 'utf-8');
  moviesCache = JSON.parse(data);
  return moviesCache;
}

function createBackup() {
  if (!fs.existsSync(moviesPath)) return;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupsDir, `movies-${timestamp}.json`);
  fs.copyFileSync(moviesPath, backupPath);

  // Clean old backups, keep only the most recent
  const backups = fs.readdirSync(backupsDir)
    .filter(f => f.startsWith('movies-') && f.endsWith('.json'))
    .sort()
    .reverse();

  backups.slice(config.maxBackups).forEach(f => {
    fs.unlinkSync(path.join(backupsDir, f));
  });
}

function saveMovies(data) {
  ensureDirectories();
  createBackup();

  data.lastModified = new Date().toISOString();
  moviesCache = data;

  fs.writeFileSync(moviesPath, JSON.stringify(data, null, 2));
}

function getAll(filters = {}) {
  const data = loadMovies();
  let movies = [...data.movies];

  // Search by title
  if (filters.search) {
    const search = filters.search.toLowerCase();
    movies = movies.filter(m => m.title.toLowerCase().includes(search));
  }

  // Filter by format
  if (filters.format) {
    const formats = Array.isArray(filters.format) ? filters.format : [filters.format];
    movies = movies.filter(m => formats.includes(m.format));
  }

  // Filter by upgrade status
  if (filters.wantToUpgrade !== undefined) {
    const want = filters.wantToUpgrade === 'true' || filters.wantToUpgrade === true;
    movies = movies.filter(m => m.wantToUpgrade === want);
  }

  // Sort - Security: Validate sortBy against allowlist
  const sortBy = ALLOWED_SORT_FIELDS.includes(filters.sortBy) ? filters.sortBy : 'title';
  const sortOrder = filters.sortOrder === 'desc' ? -1 : 1;

  movies.sort((a, b) => {
    let aVal = a[sortBy] || '';
    let bVal = b[sortBy] || '';
    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();
    if (aVal < bVal) return -1 * sortOrder;
    if (aVal > bVal) return 1 * sortOrder;
    return 0;
  });

  return movies;
}

function getById(id) {
  const data = loadMovies();
  return data.movies.find(m => m.id === id);
}

function create(movieData) {
  const data = loadMovies();

  // Security: Validate format
  const normalizedFormat = normalizeFormat(movieData.format);
  const format = ALLOWED_FORMATS.includes(normalizedFormat) ? normalizedFormat : 'dvd';

  // Security: Validate upgradeTarget
  const upgradeTarget = ALLOWED_UPGRADE_TARGETS.includes(movieData.upgradeTarget)
    ? movieData.upgradeTarget
    : null;

  // Security: Validate releaseDate format (should be 4-digit year or empty)
  const releaseDate = movieData.releaseDate && /^\d{4}$/.test(movieData.releaseDate)
    ? movieData.releaseDate
    : '';

  const movie = {
    id: uuidv4(),
    title: movieData.title,
    format: format,
    notes: movieData.notes || '',
    wantToUpgrade: movieData.wantToUpgrade || false,
    upgradeTarget: upgradeTarget,
    genre: movieData.genre || '',
    releaseDate: releaseDate,
    actors: movieData.actors || '',
    dateAdded: new Date().toISOString(),
    dateModified: new Date().toISOString(),
    source: movieData.source || 'manual',
    sourceFile: movieData.sourceFile || null
  };

  data.movies.push(movie);
  saveMovies(data);

  return movie;
}

function update(id, updates) {
  const data = loadMovies();
  const index = data.movies.findIndex(m => m.id === id);

  if (index === -1) {
    return null;
  }

  const movie = data.movies[index];

  if (updates.title !== undefined) movie.title = updates.title;

  // Security: Validate format
  if (updates.format !== undefined) {
    const normalizedFormat = normalizeFormat(updates.format);
    movie.format = ALLOWED_FORMATS.includes(normalizedFormat) ? normalizedFormat : movie.format;
  }

  if (updates.notes !== undefined) movie.notes = updates.notes;
  if (updates.wantToUpgrade !== undefined) movie.wantToUpgrade = updates.wantToUpgrade;

  // Security: Validate upgradeTarget
  if (updates.upgradeTarget !== undefined) {
    movie.upgradeTarget = ALLOWED_UPGRADE_TARGETS.includes(updates.upgradeTarget)
      ? updates.upgradeTarget
      : movie.upgradeTarget;
  }

  if (updates.genre !== undefined) movie.genre = updates.genre;

  // Security: Validate releaseDate format
  if (updates.releaseDate !== undefined) {
    movie.releaseDate = updates.releaseDate && /^\d{4}$/.test(updates.releaseDate)
      ? updates.releaseDate
      : '';
  }

  if (updates.actors !== undefined) movie.actors = updates.actors;

  movie.dateModified = new Date().toISOString();

  saveMovies(data);
  return movie;
}

function remove(id) {
  const data = loadMovies();
  const index = data.movies.findIndex(m => m.id === id);

  if (index === -1) {
    return false;
  }

  data.movies.splice(index, 1);
  saveMovies(data);
  return true;
}

function bulkCreate(movies) {
  const data = loadMovies();

  const created = movies.map(movieData => ({
    id: uuidv4(),
    title: movieData.title,
    format: normalizeFormat(movieData.format),
    notes: movieData.notes || '',
    wantToUpgrade: movieData.wantToUpgrade || false,
    upgradeTarget: movieData.upgradeTarget || null,
    genre: movieData.genre || '',
    releaseDate: movieData.releaseDate || '',
    actors: movieData.actors || '',
    dateAdded: new Date().toISOString(),
    dateModified: new Date().toISOString(),
    source: movieData.source || 'manual',
    sourceFile: movieData.sourceFile || null
  }));

  data.movies.push(...created);
  saveMovies(data);

  return created;
}

function normalizeFormat(format) {
  if (!format) return 'dvd';

  const f = format.toLowerCase();

  if (f.includes('4k')) return '4k';
  if (f.includes('blu') && f.includes('4k')) return 'bluray_4k';
  if (f.includes('blu')) return 'bluray';
  if (f.includes('dvd') && f.includes('blu')) return 'mixed';
  if (f.includes('dvd')) return 'dvd';

  return 'dvd';
}

function getStats() {
  const data = loadMovies();
  const movies = data.movies;

  return {
    total: movies.length,
    byFormat: {
      dvd: movies.filter(m => m.format === 'dvd').length,
      bluray: movies.filter(m => m.format === 'bluray').length,
      '4k': movies.filter(m => m.format === '4k').length,
      mixed: movies.filter(m => m.format === 'mixed').length
    },
    wantToUpgrade: movies.filter(m => m.wantToUpgrade).length
  };
}

function clearCache() {
  moviesCache = null;
}

module.exports = {
  loadMovies,
  getAll,
  getById,
  create,
  update,
  remove,
  bulkCreate,
  getStats,
  clearCache,
  normalizeFormat
};
