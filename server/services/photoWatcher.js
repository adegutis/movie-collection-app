const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');
const config = require('../config');
const visionService = require('./visionService');
const movieStore = require('./movieStore');

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const DEBOUNCE_MS = 2000;

let watcher = null;
let pendingQueue = [];
let isProcessing = false;
let eventHandlers = {
  processing: [],
  complete: [],
  error: []
};

function emit(event, data) {
  (eventHandlers[event] || []).forEach(fn => fn(data));
}

function on(event, handler) {
  if (!eventHandlers[event]) eventHandlers[event] = [];
  eventHandlers[event].push(handler);
}

function isImageFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext);
}

function ensureProcessedDir() {
  if (!fs.existsSync(config.processedDir)) {
    fs.mkdirSync(config.processedDir, { recursive: true });
  }
}

async function processPhoto(filePath) {
  const fileName = path.basename(filePath);

  emit('processing', { file: fileName, status: 'started' });

  try {
    if (!visionService.isConfigured()) {
      throw new Error('Vision API not configured. Set ANTHROPIC_API_KEY in .env file.');
    }

    // Identify movies from photo
    const detectedMovies = await visionService.identifyMoviesFromPhoto(filePath);

    if (detectedMovies.length === 0) {
      emit('complete', {
        file: fileName,
        status: 'no_movies_found',
        movies: []
      });
      return { file: fileName, movies: [], added: 0 };
    }

    // Check for duplicates and add new movies
    const existingMovies = movieStore.getAll();
    const added = [];
    const skipped = [];

    for (const movie of detectedMovies) {
      const duplicate = findDuplicate(movie.title, existingMovies);

      if (duplicate) {
        skipped.push({ ...movie, reason: 'duplicate', existingTitle: duplicate.title });
      } else {
        // Auto-add high confidence, queue low confidence for review
        if (movie.confidence >= 0.9) {
          const created = movieStore.create({
            title: movie.title,
            format: movie.format,
            notes: movie.notes,
            genre: movie.genre || '',
            releaseDate: movie.releaseDate || '',
            actors: movie.actors || '',
            source: 'photo_import',
            sourceFile: fileName
          });
          added.push(created);
          existingMovies.push(created); // Update for subsequent duplicate checks
        } else {
          // Lower confidence - still add but mark for review
          const created = movieStore.create({
            title: movie.title,
            format: movie.format,
            notes: `${movie.notes} [Confidence: ${Math.round(movie.confidence * 100)}%]`.trim(),
            genre: movie.genre || '',
            releaseDate: movie.releaseDate || '',
            actors: movie.actors || '',
            source: 'photo_import',
            sourceFile: fileName
          });
          added.push(created);
          existingMovies.push(created);
        }
      }
    }

    // Move photo to processed folder
    ensureProcessedDir();
    const destPath = path.join(config.processedDir, fileName);
    fs.renameSync(filePath, destPath);

    emit('complete', {
      file: fileName,
      status: 'success',
      movies: detectedMovies,
      added: added.length,
      skipped: skipped.length
    });

    return {
      file: fileName,
      movies: detectedMovies,
      added: added.length,
      skipped
    };

  } catch (error) {
    emit('error', { file: fileName, error: error.message });
    throw error;
  }
}

function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/^the\s+/i, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function findDuplicate(title, existingMovies) {
  const normalizedNew = normalizeTitle(title);

  for (const existing of existingMovies) {
    const normalizedExisting = normalizeTitle(existing.title);

    // Exact match
    if (normalizedNew === normalizedExisting) {
      return existing;
    }

    // Simple similarity check
    if (normalizedNew.length > 3 && normalizedExisting.length > 3) {
      if (normalizedNew.includes(normalizedExisting) ||
          normalizedExisting.includes(normalizedNew)) {
        return existing;
      }
    }
  }

  return null;
}

async function processQueue() {
  if (isProcessing || pendingQueue.length === 0) return;

  isProcessing = true;

  while (pendingQueue.length > 0) {
    const filePath = pendingQueue.shift();

    try {
      await processPhoto(filePath);
    } catch (error) {
      console.error(`Failed to process ${filePath}:`, error.message);
    }
  }

  isProcessing = false;
}

function start() {
  if (watcher) {
    console.log('Photo watcher already running');
    return;
  }

  console.log(`Watching for photos in: ${config.sourcesDir}`);

  watcher = chokidar.watch(config.sourcesDir, {
    ignored: [
      /(^|[\/\\])\../,           // Ignore dotfiles
      config.processedDir,       // Ignore processed folder
      /\.csv$/i                  // Ignore CSV files
    ],
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: DEBOUNCE_MS,
      pollInterval: 100
    }
  });

  watcher.on('add', (filePath) => {
    if (!isImageFile(filePath)) return;

    console.log(`New photo detected: ${path.basename(filePath)}`);
    pendingQueue.push(filePath);
    processQueue();
  });

  watcher.on('error', (error) => {
    console.error('Photo watcher error:', error);
  });
}

function stop() {
  if (watcher) {
    watcher.close();
    watcher = null;
    console.log('Photo watcher stopped');
  }
}

function getStatus() {
  return {
    running: watcher !== null,
    configured: visionService.isConfigured(),
    queueLength: pendingQueue.length,
    processing: isProcessing
  };
}

module.exports = {
  start,
  stop,
  getStatus,
  processPhoto,
  on
};
