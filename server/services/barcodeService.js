const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');
const config = require('../config');

let anthropicClient = null;

function getAnthropicClient() {
  if (!config.anthropicApiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured. Add it to your .env file.');
  }

  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: config.anthropicApiKey });
  }

  return anthropicClient;
}

/**
 * Extract barcode number from image using Claude Vision
 */
async function extractBarcodeFromImage(imagePath) {
  const anthropic = getAnthropicClient();

  if (!fs.existsSync(imagePath)) {
    throw new Error(`Image file not found: ${imagePath}`);
  }

  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');

  const ext = path.extname(imagePath).toLowerCase();
  let mediaType = 'image/jpeg';
  if (ext === '.png') mediaType = 'image/png';
  else if (ext === '.gif') mediaType = 'image/gif';
  else if (ext === '.webp') mediaType = 'image/webp';

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType,
            data: base64Image
          }
        },
        {
          type: 'text',
          text: `Look at this image and find any barcodes (UPC, EAN, ISBN).

Please extract the barcode number(s) you can see. Return ONLY a JSON object with the barcode number, no other text:

{"barcode": "123456789012", "type": "UPC-A"}

If you cannot find a clear barcode, return: {"barcode": null, "error": "No barcode detected"}

Common barcode formats:
- UPC-A: 12 digits
- EAN-13: 13 digits
- ISBN: 10 or 13 digits`
        }
      ]
    }]
  });

  const content = response.content[0].text;

  // Extract JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { barcode: null, error: 'Failed to parse barcode response' };
  }

  try {
    const result = JSON.parse(jsonMatch[0]);
    return result;
  } catch (error) {
    console.error('Failed to parse barcode JSON:', error);
    return { barcode: null, error: 'Invalid JSON response' };
  }
}

/**
 * Look up product info from UPCitemdb API
 */
async function lookupUPC(barcode) {
  const url = `https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || !data.items || data.items.length === 0) {
      return null;
    }

    const item = data.items[0];
    return {
      title: item.title,
      brand: item.brand,
      description: item.description,
      category: item.category,
      upc: barcode
    };
  } catch (error) {
    console.error('UPCitemdb lookup error:', error);
    return null;
  }
}

/**
 * Search TMDb for movie metadata
 */
async function searchTMDb(title, year = null) {
  if (!config.tmdbApiKey) {
    console.warn('TMDB_API_KEY not configured, skipping TMDb lookup');
    return null;
  }

  try {
    const query = encodeURIComponent(title);
    const yearParam = year ? `&year=${year}` : '';
    const url = `https://api.themoviedb.org/3/search/movie?api_key=${config.tmdbApiKey}&query=${query}${yearParam}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || !data.results || data.results.length === 0) {
      return null;
    }

    // Get the first result (best match)
    const movie = data.results[0];

    // Get additional details
    const detailsUrl = `https://api.themoviedb.org/3/movie/${movie.id}?api_key=${config.tmdbApiKey}&append_to_response=credits`;
    const detailsResponse = await fetch(detailsUrl);
    const details = await detailsResponse.json();

    // Extract top 3 actors
    const actors = details.credits?.cast
      ?.slice(0, 3)
      .map(actor => actor.name)
      .join(', ') || '';

    return {
      title: details.title,
      genre: details.genres?.map(g => g.name).join(', ') || '',
      releaseDate: details.release_date?.substring(0, 4) || '',
      actors: actors,
      overview: details.overview || ''
    };
  } catch (error) {
    console.error('TMDb lookup error:', error);
    return null;
  }
}

/**
 * Complete barcode lookup workflow
 */
async function lookupMovieByBarcode(imagePath) {
  // Step 1: Extract barcode from image
  const barcodeResult = await extractBarcodeFromImage(imagePath);

  if (!barcodeResult.barcode) {
    return {
      success: false,
      error: barcodeResult.error || 'No barcode detected in image'
    };
  }

  // Step 2: Look up product info from UPC database
  const productInfo = await lookupUPC(barcodeResult.barcode);

  if (!productInfo) {
    return {
      success: false,
      error: 'Barcode found but product not in UPC database',
      barcode: barcodeResult.barcode
    };
  }

  // Step 3: Extract movie title and search TMDb
  let movieTitle = productInfo.title;

  // Clean up the title for better TMDb matching
  movieTitle = movieTitle
    // Remove parenthetical content (includes digital copy info, etc.)
    .replace(/\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]/g, '')
    // Remove common disc/packaging terms
    .replace(/\b(DVD|Blu-ray|BluRay|4K|Ultra HD|UHD|Digital Copy|Digital HD|HDX)\b/gi, '')
    // Remove edition info
    .replace(/\b(Special Edition|Collector's Edition|Director's Cut|Extended Edition|Limited Edition|Anniversary Edition|Criterion Collection)\b/gi, '')
    // Remove publisher names
    .replace(/\b(Sony Pictures|Warner Bros|Universal|Paramount|Disney|Fox|MGM|Lionsgate)\b/gi, '')
    // Remove extra symbols and whitespace
    .replace(/[+\-:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const tmdbData = await searchTMDb(movieTitle);

  // Step 4: Combine data
  return {
    success: true,
    barcode: barcodeResult.barcode,
    barcodeType: barcodeResult.type,
    productInfo: productInfo,
    movie: {
      title: tmdbData?.title || movieTitle,
      genre: tmdbData?.genre || '',
      releaseDate: tmdbData?.releaseDate || '',
      actors: tmdbData?.actors || '',
      notes: extractFormat(productInfo.title) || '',
      format: detectFormat(productInfo.title)
    }
  };
}

/**
 * Detect format from product title
 */
function detectFormat(title) {
  const titleLower = title.toLowerCase();

  if (titleLower.includes('4k') || titleLower.includes('ultra hd')) {
    return '4k';
  }
  if (titleLower.includes('blu-ray') || titleLower.includes('bluray')) {
    return 'bluray';
  }
  return 'dvd';
}

/**
 * Extract edition info from product title
 */
function extractFormat(title) {
  const editions = [
    'Special Edition',
    'Collector\'s Edition',
    'Director\'s Cut',
    'Extended Edition',
    'Limited Edition',
    'Anniversary Edition',
    'Criterion Collection'
  ];

  for (const edition of editions) {
    if (title.includes(edition)) {
      return edition;
    }
  }

  return '';
}

function isConfigured() {
  return !!config.anthropicApiKey;
}

module.exports = {
  extractBarcodeFromImage,
  lookupUPC,
  searchTMDb,
  lookupMovieByBarcode,
  isConfigured
};
