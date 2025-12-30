const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const movieStore = require('./movieStore');
const config = require('../config');

function importFromCsv(csvPath) {
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}`);
  }

  const content = fs.readFileSync(csvPath, 'utf-8');

  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });

  const movies = records.map(record => ({
    title: cleanTitle(record['Title'] || record['title']),
    format: record['Format'] || record['format'] || 'DVD',
    notes: record['Notes / Collection Info'] || record['Notes'] || record['notes'] || '',
    source: 'csv_import',
    wantToUpgrade: false
  }));

  // Filter out any entries with empty titles
  const validMovies = movies.filter(m => m.title && m.title.trim());

  const created = movieStore.bulkCreate(validMovies);

  return {
    imported: created.length,
    movies: created
  };
}

function cleanTitle(title) {
  if (!title) return '';

  // Handle titles that start with "The " at the end like "Lion King, The"
  // Keep as-is since user may prefer that format
  return title.trim();
}

// CLI usage
if (require.main === module) {
  const csvPath = process.argv[2] || path.join(config.sourcesDir, 'Movie-List-Cabinet-Photos.csv');

  console.log(`Importing from: ${csvPath}`);

  try {
    const result = importFromCsv(csvPath);
    console.log(`Successfully imported ${result.imported} movies`);
  } catch (error) {
    console.error('Import failed:', error.message);
    process.exit(1);
  }
}

module.exports = {
  importFromCsv
};
