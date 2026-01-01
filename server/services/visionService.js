const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');
const config = require('../config');

let client = null;

function getClient() {
  if (!config.anthropicApiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured. Add it to your .env file.');
  }

  if (!client) {
    client = new Anthropic({ apiKey: config.anthropicApiKey });
  }

  return client;
}

async function identifyMoviesFromPhoto(imagePath) {
  const anthropic = getClient();

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
    max_tokens: 4096,
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
          text: `Analyze this photo of DVD/Blu-ray movie cases (likely on a shelf or in a collection).

For each visible movie, identify:
1. Title - exact title as printed on the case spine or front
2. Format - Look for these indicators:
   - "DVD" logo (usually red/orange)
   - "Blu-ray" or "Blu-ray Disc" logo (blue)
   - "4K Ultra HD" logo (black/gold)
3. Notes - Any edition info visible (Special Edition, Collector's Edition, season numbers, etc.)
4. Genre - The genre of the movie (Action, Comedy, Drama, Horror, Sci-Fi, etc.) based on your knowledge
5. Release Date - The theatrical release year (e.g., "1994", "2010") based on your knowledge
6. Actors - Top billed actors (e.g., "Tom Hanks, Robin Wright") based on your knowledge

Return ONLY a valid JSON array, no other text or explanation:
[
  {
    "title": "Movie Title",
    "format": "DVD",
    "notes": "edition info or empty string",
    "genre": "Genre",
    "releaseDate": "Year",
    "actors": "Actor 1, Actor 2",
    "confidence": 0.95
  }
]

Format values must be exactly one of: "DVD", "Blu-ray", "4K Ultra HD"

Set confidence (0.0-1.0) based on how clearly you can read the title:
- 0.9-1.0: Perfectly clear and readable
- 0.7-0.9: Readable but partially obscured or at angle
- 0.5-0.7: Partially visible, making educated guess
- <0.5: Very uncertain

If no movies are visible or the image doesn't show movie cases, return: []`
        }
      ]
    }]
  });

  const content = response.content[0].text;

  // Extract JSON array from response
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.warn('No JSON array found in vision response:', content);
    return [];
  }

  try {
    const movies = JSON.parse(jsonMatch[0]);
    return movies.map(m => ({
      title: m.title || '',
      format: m.format || 'DVD',
      notes: m.notes || '',
      genre: m.genre || '',
      releaseDate: m.releaseDate || '',
      actors: m.actors || '',
      confidence: m.confidence || 0.5
    }));
  } catch (error) {
    console.error('Failed to parse vision response:', error);
    return [];
  }
}

function isConfigured() {
  return !!config.anthropicApiKey;
}

module.exports = {
  identifyMoviesFromPhoto,
  isConfigured
};
