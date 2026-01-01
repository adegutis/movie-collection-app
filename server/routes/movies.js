const express = require('express');
const router = express.Router();
const movieStore = require('../services/movieStore');

// Security: Helper for production-safe error responses
function handleError(res, error, context) {
  const isProduction = process.env.NODE_ENV === 'production';
  console.error(`Error in ${context}:`, error);
  res.status(500).json({ error: isProduction ? 'Internal server error' : error.message });
}

// GET /api/movies - List all movies with optional filters
router.get('/', (req, res) => {
  try {
    const filters = {
      search: req.query.search,
      format: req.query.format,
      wantToUpgrade: req.query.wantToUpgrade,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder
    };

    const movies = movieStore.getAll(filters);
    res.json({ movies, count: movies.length });
  } catch (error) {
    handleError(res, error, 'listing movies');
  }
});

// GET /api/movies/stats - Get collection statistics
router.get('/stats', (req, res) => {
  try {
    const stats = movieStore.getStats();
    res.json(stats);
  } catch (error) {
    handleError(res, error, 'getting stats');
  }
});

// GET /api/movies/export - Export movies as JSON or CSV
router.get('/export', (req, res) => {
  try {
    const format = req.query.format || 'json';
    const movies = movieStore.getAll({});

    if (format === 'csv') {
      // Generate CSV
      const headers = ['Title', 'Format', 'Notes', 'Genre', 'Release Date', 'Actors', 'Want Upgrade', 'Upgrade Target', 'Date Added'];
      const rows = movies.map(movie => [
        escapeCSV(movie.title),
        escapeCSV(movie.format),
        escapeCSV(movie.notes || ''),
        escapeCSV(movie.genre || ''),
        escapeCSV(movie.releaseDate || ''),
        escapeCSV(movie.actors || ''),
        movie.wantToUpgrade ? 'Yes' : 'No',
        escapeCSV(movie.upgradeTarget || ''),
        movie.dateAdded
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="movie-collection-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } else {
      // Return JSON
      res.json(movies);
    }
  } catch (error) {
    handleError(res, error, 'exporting movies');
  }
});

// Helper function to escape CSV values
function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// GET /api/movies/:id - Get single movie
router.get('/:id', (req, res) => {
  try {
    const movie = movieStore.getById(req.params.id);
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }
    res.json(movie);
  } catch (error) {
    handleError(res, error, 'getting movie');
  }
});

// POST /api/movies - Create new movie
router.post('/', (req, res) => {
  try {
    const { title, format, notes, wantToUpgrade, upgradeTarget } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Security: Validate input lengths
    if (title.length > 500) {
      return res.status(400).json({ error: 'Title exceeds maximum length' });
    }
    if (notes && notes.length > 2000) {
      return res.status(400).json({ error: 'Notes exceed maximum length' });
    }

    const movie = movieStore.create({
      title: title.trim(),
      format,
      notes,
      wantToUpgrade,
      upgradeTarget,
      source: 'manual'
    });

    res.status(201).json(movie);
  } catch (error) {
    handleError(res, error, 'creating movie');
  }
});

// PUT /api/movies/:id - Update movie
router.put('/:id', (req, res) => {
  try {
    // Security: Validate input lengths
    if (req.body.title && req.body.title.length > 500) {
      return res.status(400).json({ error: 'Title exceeds maximum length' });
    }
    if (req.body.notes && req.body.notes.length > 2000) {
      return res.status(400).json({ error: 'Notes exceed maximum length' });
    }

    const movie = movieStore.update(req.params.id, req.body);

    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    res.json(movie);
  } catch (error) {
    handleError(res, error, 'updating movie');
  }
});

// DELETE /api/movies/:id - Delete movie
router.delete('/:id', (req, res) => {
  try {
    const deleted = movieStore.remove(req.params.id);

    if (!deleted) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    res.json({ success: true });
  } catch (error) {
    handleError(res, error, 'deleting movie');
  }
});

module.exports = router;
