const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const fileType = require('file-type');
const csvImporter = require('../services/csvImporter');
const photoWatcher = require('../services/photoWatcher');
const visionService = require('../services/visionService');
const barcodeService = require('../services/barcodeService');
const movieStore = require('../services/movieStore');
const config = require('../config');

// Security: Validate that a path is within an allowed directory
function isPathWithinDirectory(filePath, directory) {
  const resolvedPath = path.resolve(filePath);
  const resolvedDir = path.resolve(directory);
  return resolvedPath.startsWith(resolvedDir + path.sep) || resolvedPath === resolvedDir;
}

// Security: Sanitize filename to prevent path traversal
function sanitizeFilename(filename) {
  return path.basename(filename);
}

// Security: Validate file extension
function hasAllowedExtension(filename, allowedExtensions) {
  const ext = path.extname(filename).toLowerCase();
  return allowedExtensions.includes(ext);
}

// Security: Validate uploaded file using magic bytes (file signature)
async function validateUploadedFile(req, res, next) {
  if (!req.file) {
    return next();
  }

  try {
    const buffer = fs.readFileSync(req.file.path);
    const type = await fileType.fromBuffer(buffer);

    // Allowed MIME types based on magic bytes
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (!type || !allowedMimes.includes(type.mime)) {
      // Clean up invalid file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: 'Invalid file content. File does not match expected image format.'
      });
    }

    next();
  } catch (error) {
    // Clean up on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Error validating file:', error);
    res.status(500).json({ error: 'Error validating uploaded file' });
  }
}

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
    let csvPath;

    if (req.body.path) {
      // Security: Only allow basename, resolve within sourcesDir
      const sanitizedFilename = sanitizeFilename(req.body.path);
      csvPath = path.join(config.sourcesDir, sanitizedFilename);

      // Validate path is within allowed directory
      if (!isPathWithinDirectory(csvPath, config.sourcesDir)) {
        return res.status(400).json({ error: 'Invalid file path' });
      }

      // Validate file extension
      if (!hasAllowedExtension(sanitizedFilename, ['.csv'])) {
        return res.status(400).json({ error: 'Only CSV files are allowed' });
      }
    } else {
      csvPath = path.join(config.sourcesDir, 'Movie-List-Cabinet-Photos.csv');
    }

    const result = csvImporter.importFromCsv(csvPath);

    res.json({
      success: true,
      message: `Imported ${result.imported} movies`,
      count: result.imported
    });
  } catch (error) {
    const isProduction = process.env.NODE_ENV === 'production';
    console.error('Error importing CSV:', error);
    res.status(500).json({ error: isProduction ? 'Internal server error' : error.message });
  }
});

// GET /api/import/status - Get photo watcher status
router.get('/status', (req, res) => {
  const status = photoWatcher.getStatus();
  res.json(status);
});

// POST /api/import/upload - Upload and analyze a photo
router.post('/upload', upload.single('photo'), validateUploadedFile, async (req, res) => {
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

    let detectedMovies = [];
    let detectionMethod = null;
    let barcodeAttempted = false;
    let barcodeNumber = null;

    // Try barcode detection first (more reliable when available)
    if (barcodeService.isConfigured()) {
      barcodeAttempted = true;
      try {
        const barcodeResult = await barcodeService.lookupMovieByBarcode(imagePath);

        if (barcodeResult.success) {
          console.log(`✓ Barcode detection successful: ${barcodeResult.movie.title}`);
          detectionMethod = 'barcode';
          barcodeNumber = barcodeResult.barcode;
          // Convert barcode result to detectedMovies format
          detectedMovies = [{
            title: barcodeResult.movie.title,
            format: barcodeResult.movie.format,
            notes: barcodeResult.movie.notes || '',
            genre: barcodeResult.movie.genre || '',
            releaseDate: barcodeResult.movie.releaseDate || '',
            actors: barcodeResult.movie.actors || '',
            confidence: 1.0 // Barcode lookup is high confidence
          }];
        } else {
          console.log(`✗ Barcode detection: ${barcodeResult.error || 'No barcode found'}`);
          barcodeNumber = barcodeResult.barcode || null;
        }
      } catch (barcodeError) {
        console.log(`✗ Barcode detection error: ${barcodeError.message}`);
      }
    }

    // If barcode detection found no movies, try AI analysis as fallback
    if (detectedMovies.length === 0) {
      console.log(`Trying AI disc case analysis for ${fileName}...`);
      detectedMovies = await visionService.identifyMoviesFromPhoto(imagePath);
      if (detectedMovies.length > 0) {
        console.log(`✓ AI analysis found ${detectedMovies.length} movie(s)`);
        detectionMethod = 'ai_vision';
      } else {
        console.log(`✗ AI analysis found no movies`);
      }
    }

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
    // Security: Don't expose full server path
    res.json({
      success: true,
      fileName,
      movies: results,
      count: results.length,
      debug: {
        detectionMethod,
        barcodeAttempted,
        barcodeNumber
      }
    });
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    const isProduction = process.env.NODE_ENV === 'production';
    console.error('Error processing upload:', error);
    res.status(500).json({ error: isProduction ? 'Internal server error' : error.message });
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

      // Security: Validate movie data lengths
      if (movie.title && movie.title.length > 500) {
        return res.status(400).json({ error: 'Movie title exceeds maximum length' });
      }
      if (movie.notes && movie.notes.length > 2000) {
        return res.status(400).json({ error: 'Movie notes exceed maximum length' });
      }

      const created = movieStore.create({
        title: movie.title,
        format: movie.format,
        notes: movie.notes || '',
        genre: movie.genre || '',
        releaseDate: movie.releaseDate || '',
        actors: movie.actors || '',
        source: 'photo_import',
        sourceFile: fileName ? sanitizeFilename(fileName) : undefined
      });
      added.push(created);
    }

    // Move the source file to processed folder if it exists
    if (fileName) {
      // Security: Sanitize filename to prevent path traversal
      const sanitizedFileName = sanitizeFilename(fileName);
      const sourcePath = path.join(config.sourcesDir, sanitizedFileName);

      // Validate path is within allowed directory
      if (!isPathWithinDirectory(sourcePath, config.sourcesDir)) {
        console.warn('Attempted path traversal in fileName:', fileName);
      } else if (fs.existsSync(sourcePath)) {
        const processedDir = path.join(config.sourcesDir, 'processed');
        if (!fs.existsSync(processedDir)) {
          fs.mkdirSync(processedDir, { recursive: true });
        }
        const destPath = path.join(processedDir, sanitizedFileName);
        // Double-check destination is safe
        if (isPathWithinDirectory(destPath, processedDir)) {
          fs.renameSync(sourcePath, destPath);
        }
      }
    }

    res.json({
      success: true,
      added: added.length,
      movies: added
    });
  } catch (error) {
    const isProduction = process.env.NODE_ENV === 'production';
    console.error('Error confirming import:', error);
    res.status(500).json({ error: isProduction ? 'Internal server error' : error.message });
  }
});

// POST /api/import/photo - Manually process a specific photo (legacy)
router.post('/photo', async (req, res) => {
  try {
    const { filename } = req.body;

    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }

    // Security: Sanitize filename to prevent path traversal
    const sanitizedFilename = sanitizeFilename(filename);

    // Security: Validate file extension
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    if (!hasAllowedExtension(sanitizedFilename, allowedExtensions)) {
      return res.status(400).json({ error: 'Invalid file type' });
    }

    const imagePath = path.join(config.sourcesDir, sanitizedFilename);

    // Security: Verify path is within allowed directory
    if (!isPathWithinDirectory(imagePath, config.sourcesDir)) {
      return res.status(400).json({ error: 'Invalid file path' });
    }

    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: 'Image file not found' });
    }

    const result = await photoWatcher.processPhoto(imagePath);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    const isProduction = process.env.NODE_ENV === 'production';
    console.error('Error processing photo:', error);
    res.status(500).json({ error: isProduction ? 'Internal server error' : error.message });
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
    const isProduction = process.env.NODE_ENV === 'production';
    console.error('Error listing pending files:', error);
    res.status(500).json({ error: isProduction ? 'Internal server error' : error.message });
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

// POST /api/import/barcode - Upload and analyze a barcode photo
router.post('/barcode', upload.single('photo'), validateUploadedFile, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No photo uploaded' });
    }

    if (!barcodeService.isConfigured()) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: 'AI vision not configured. Please set ANTHROPIC_API_KEY in your .env file.',
        needsSetup: true
      });
    }

    const imagePath = req.file.path;
    const fileName = req.file.filename;

    // Analyze the barcode and lookup movie
    const result = await barcodeService.lookupMovieByBarcode(imagePath);

    // Clean up the uploaded file
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    if (!result.success) {
      return res.status(400).json({
        error: result.error,
        barcode: result.barcode
      });
    }

    // Check for duplicates
    const existingMovies = movieStore.getAll();
    const duplicate = findDuplicate(result.movie.title, existingMovies);

    res.json({
      success: true,
      barcode: result.barcode,
      barcodeType: result.barcodeType,
      productInfo: result.productInfo,
      movie: {
        ...result.movie,
        isDuplicate: !!duplicate,
        existingTitle: duplicate ? duplicate.title : null
      }
    });
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    const isProduction = process.env.NODE_ENV === 'production';
    console.error('Error processing barcode:', error);
    res.status(500).json({ error: isProduction ? 'Internal server error' : error.message });
  }
});

module.exports = router;
