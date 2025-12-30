const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const csvImporter = require('../services/csvImporter');
const photoWatcher = require('../services/photoWatcher');
const visionService = require('../services/visionService');
const movieStore = require('../services/movieStore');
const config = require('../config');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.sourcesDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `upload-${timestamp}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
    }
  }
});

// POST /api/import/csv - Import movies from CSV file
router.post('/csv', (req, res) => {
  try {
    const csvPath = req.body.path || path.join(config.sourcesDir, 'Movie-List-Cabinet-Photos.csv');

    const result = csvImporter.importFromCsv(csvPath);

    res.json({
      success: true,
      message: `Imported ${result.imported} movies`,
      count: result.imported
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/import/status - Get photo watcher status
router.get('/status', (req, res) => {
  const status = photoWatcher.getStatus();
  res.json(status);
});

// POST /api/import/upload - Upload and analyze a photo
router.post('/upload', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No photo uploaded' });
    }

    if (!visionService.isConfigured()) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: 'AI vision not configured. Please set ANTHROPIC_API_KEY in your .env file.',
        needsSetup: true
      });
    }

    const imagePath = req.file.path;
    const fileName = req.file.filename;

    // Analyze the photo
    const detectedMovies = await visionService.identifyMoviesFromPhoto(imagePath);

    // Check for duplicates
    const existingMovies = movieStore.getAll();
    const results = detectedMovies.map(movie => {
      const duplicate = findDuplicate(movie.title, existingMovies);
      return {
        ...movie,
        isDuplicate: !!duplicate,
        existingTitle: duplicate ? duplicate.title : null
      };
    });

    // Keep the file for reference but move to processed after confirmation
    res.json({
      success: true,
      fileName,
      filePath: imagePath,
      movies: results,
      count: results.length
    });
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
});

// POST /api/import/confirm - Confirm and add detected movies
router.post('/confirm', async (req, res) => {
  try {
    const { movies, fileName } = req.body;

    if (!movies || !Array.isArray(movies)) {
      return res.status(400).json({ error: 'Movies array is required' });
    }

    const added = [];
    for (const movie of movies) {
      if (movie.skip) continue;

      const created = movieStore.create({
        title: movie.title,
        format: movie.format,
        notes: movie.notes || '',
        source: 'photo_import',
        sourceFile: fileName
      });
      added.push(created);
    }

    // Move the source file to processed folder if it exists
    if (fileName) {
      const sourcePath = path.join(config.sourcesDir, fileName);
      if (fs.existsSync(sourcePath)) {
        const processedDir = path.join(config.sourcesDir, 'processed');
        if (!fs.existsSync(processedDir)) {
          fs.mkdirSync(processedDir, { recursive: true });
        }
        fs.renameSync(sourcePath, path.join(processedDir, fileName));
      }
    }

    res.json({
      success: true,
      added: added.length,
      movies: added
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/import/photo - Manually process a specific photo (legacy)
router.post('/photo', async (req, res) => {
  try {
    const { filename } = req.body;

    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }

    const imagePath = path.join(config.sourcesDir, filename);

    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: 'Image file not found' });
    }

    const result = await photoWatcher.processPhoto(imagePath);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/import/pending - List pending photos in sources folder
router.get('/pending', (req, res) => {
  try {
    const files = fs.readdirSync(config.sourcesDir)
      .filter(f => {
        const ext = path.extname(f).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
      });

    res.json({ files });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to find duplicates
function findDuplicate(title, existingMovies) {
  const normalizedNew = normalizeTitle(title);

  for (const existing of existingMovies) {
    const normalizedExisting = normalizeTitle(existing.title);

    if (normalizedNew === normalizedExisting) {
      return existing;
    }

    if (normalizedNew.length > 3 && normalizedExisting.length > 3) {
      if (normalizedNew.includes(normalizedExisting) ||
          normalizedExisting.includes(normalizedNew)) {
        return existing;
      }
    }
  }

  return null;
}

function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/^the\s+/i, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = router;
