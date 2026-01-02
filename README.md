# Movie Collection Manager - Feature Documentation

A full-featured web application for managing your DVD, Blu-ray, and 4K Ultra HD movie collection with AI-powered photo import and barcode scanning.

---

## Table of Contents

- [Authentication](#authentication)
- [Movie Management](#movie-management)
- [Search and Filtering](#search-and-filtering)
- [Sorting](#sorting)
- [View Modes](#view-modes)
- [Photo Import](#photo-import)
- [Barcode Scanning](#barcode-scanning)
- [Export Features](#export-features)
- [Security Features](#security-features)
- [UI Components](#ui-components)

---

## Authentication

### Login Page (`/login`)
**When**: APP_PASSWORD is configured in environment
**Location**: `/login`

#### Test Cases:
- ✅ Login page displays when password is configured
- ✅ Invalid password shows error message
- ✅ Valid password redirects to main app (`/`)
- ✅ Session cookie is set on successful login (HttpOnly, SameSite=Strict)
- ✅ Session expires after 30 days
- ✅ Rate limiting prevents brute force (5 attempts per 15 minutes)

#### Elements:
- Password input field
- Submit button
- Error message (shown on invalid password)

---

## Movie Management

### Add Movie
**Location**: "Add Movie" button in header
**Modal**: Movie form modal

#### Test Cases:
- ✅ Opens modal with empty form
- ✅ Title field is required (max 500 chars)
- ✅ Format dropdown has options: DVD, Blu-ray, 4K Ultra HD, Mixed
- ✅ Notes field accepts text (max 2000 chars)
- ✅ Genre field accepts text (max 200 chars)
- ✅ Release Date accepts 4-digit year format (e.g., "1994")
- ✅ Actors field accepts comma-separated names (max 500 chars)
- ✅ "Want to Upgrade" checkbox toggles upgrade options
- ✅ Upgrade target dropdown shows: 4K, Blu-ray
- ✅ Saving creates movie with current timestamp for dateAdded
- ✅ Cancel button closes modal without saving
- ✅ Form validation prevents empty title submission

#### Fields:
- `title` (required, string, max 500 chars)
- `format` (required, enum: dvd|bluray|4k|mixed)
- `notes` (optional, string, max 2000 chars)
- `genre` (optional, string, max 200 chars)
- `releaseDate` (optional, string, 4-digit year)
- `actors` (optional, string, max 500 chars)
- `wantToUpgrade` (optional, boolean)
- `upgradeTarget` (optional, enum: 4k|bluray)

---

### View Movie Details
**Trigger**: Click on movie card
**Modal**: Details modal (read-only)

#### Test Cases:
- ✅ Shows movie title
- ✅ Shows format badge with correct color (DVD=orange, Blu-ray=blue, 4K=purple, Mixed=green)
- ✅ Shows genre if present
- ✅ Shows release date if present
- ✅ Shows actors if present
- ✅ Shows notes if present
- ✅ Shows upgrade status and target if applicable
- ✅ Hides empty fields (genre, release date, actors, notes)
- ✅ Edit button opens edit modal
- ✅ Delete button opens delete confirmation
- ✅ Close button (X) closes modal

#### Elements:
- Title text
- Format badge
- Genre row (conditionally shown)
- Release date row (conditionally shown)
- Actors row (conditionally shown)
- Notes row (conditionally shown)
- Upgrade status row (conditionally shown)
- Edit button
- Delete button
- Close button

---

### Edit Movie
**Trigger**: Edit button in details modal
**Modal**: Movie form modal (pre-filled)

#### Test Cases:
- ✅ Opens modal with movie data pre-filled
- ✅ All fields are editable
- ✅ Saving updates movie and updates dateModified timestamp
- ✅ Changes are immediately visible in movie list
- ✅ Cancel button closes modal without saving changes
- ✅ Validation rules same as Add Movie

---

### Delete Movie
**Trigger**: Delete button in details modal
**Modal**: Delete confirmation modal

#### Test Cases:
- ✅ Shows confirmation with movie title
- ✅ Cancel button closes modal without deleting
- ✅ Confirm button deletes movie
- ✅ Movie is removed from list immediately
- ✅ Movie count updates after deletion
- ✅ Details modal closes after deletion

---

## Search and Filtering

### Search
**Location**: Search input in controls bar
**Behavior**: Real-time search with debounce (300ms)

#### Test Cases:
- ✅ Searches movie titles (case-insensitive)
- ✅ Updates results as user types
- ✅ Shows all movies when search is cleared
- ✅ Empty results show "No movies found" message
- ✅ Search persists across view mode changes
- ✅ Search works with filters simultaneously

#### Search Targets:
- Movie title (partial match, case-insensitive)

---

### Format Filter
**Location**: Format dropdown in controls bar

#### Test Cases:
- ✅ "All Formats" option shows all movies
- ✅ "DVD" option shows only DVD format movies
- ✅ "Blu-ray" option shows only Blu-ray format movies
- ✅ "4K Ultra HD" option shows only 4K format movies
- ✅ "Mixed" option shows only mixed format movies
- ✅ Filter works with search simultaneously
- ✅ Movie count updates to reflect filtered results

---

### Wants Upgrade Filter
**Location**: "Wants Upgrade" checkbox in controls bar

#### Test Cases:
- ✅ Unchecked shows all movies
- ✅ Checked shows only movies marked for upgrade
- ✅ Filter works with search and format filter simultaneously
- ✅ Checkbox state persists across view mode changes

---

## Sorting

### Sort By
**Location**: Sort dropdown in controls bar

#### Test Cases:
- ✅ Sort by Title (alphabetical)
- ✅ Sort by Format (dvd, bluray, 4k, mixed order)
- ✅ Sort by Genre (alphabetical)
- ✅ Sort by Release Date (chronological)
- ✅ Sort by Actors (alphabetical)
- ✅ Sort by Notes (alphabetical)
- ✅ Sort by Date Added (chronological, newest first default)
- ✅ Empty values sorted to end
- ✅ Sorting is case-insensitive
- ✅ Sort persists across filtering and search

#### Sort Options:
- `title` (default)
- `format`
- `genre`
- `releaseDate`
- `actors`
- `notes`
- `dateAdded`

---

### Sort Order Toggle
**Location**: Sort order button (▲/▼) next to sort dropdown

#### Test Cases:
- ✅ Button shows ▲ for ascending order (default)
- ✅ Button shows ▼ for descending order
- ✅ Click toggles between ascending and descending
- ✅ Sort order applies to current sort field
- ✅ Sort order persists when changing sort field
- ✅ Visual feedback on button click (scale animation)

---

## View Modes

### Grid View
**Location**: Grid icon button in controls bar
**Default**: Not default

#### Test Cases:
- ✅ Button becomes active when selected
- ✅ Movies display in responsive grid (min 300px columns)
- ✅ Cards show title, format badge, notes preview
- ✅ Hover effect (translateY -2px)
- ✅ Click opens details modal

---

### List View
**Location**: List icon button in controls bar
**Default**: Yes

#### Test Cases:
- ✅ Button is active by default
- ✅ Movies display in single-column list
- ✅ Each row shows title, notes, format badge
- ✅ Hover effect (background color change)
- ✅ Click opens details modal
- ✅ First item has rounded top corners
- ✅ Last item has rounded bottom corners

---

## Photo Import

### Import from Photo (AI Analysis)
**Location**: "Import from Photo" button in action buttons
**Modal**: Import modal with multi-step flow

#### Test Cases:
- ✅ Modal opens with upload options: "📸 Take Photo" and "📁 Upload Photo"
- ✅ Upload Photo button opens file picker
- ✅ Take Photo button opens camera (requires HTTPS on mobile)
- ✅ File size limit: 20MB
- ✅ Accepted formats: JPEG, PNG, GIF, WebP
- ✅ File validation rejects non-image files using magic bytes
- ✅ Shows analyzing spinner during processing
- ✅ Tries barcode detection first
- ✅ Falls back to AI disc case analysis if no barcode
- ✅ Error shown if no movies detected
- ✅ Results show list of detected movies with confidence badges

#### Upload Flow:
1. **Upload Step**: Choose between camera or file upload
2. **Analyzing Step**: Shows spinner while processing
3. **Results Step**: Shows detected movies with edit options
4. **Error Step**: Shows if detection fails

#### AI Analysis Features:
- Detects movie titles from disc case spines, fronts, or backs
- Identifies format (DVD, Blu-ray, 4K) from logos
- Extracts edition info (Special Edition, etc.)
- Looks up genre, release date, and actors from knowledge base
- Provides confidence score (0.0-1.0)

#### Results Display:
- Movie title (editable)
- Format dropdown (editable)
- Confidence badge if < 0.8
- Duplicate badge if already in collection
- Checkbox to include/exclude from import
- Edit fields for title and format

#### Test Cases - Results:
- ✅ Can edit movie title before importing
- ✅ Can change format before importing
- ✅ Can uncheck movies to exclude from import
- ✅ Duplicate movies show warning badge
- ✅ Low confidence movies (<0.8) show warning badge
- ✅ "Import Another" button returns to upload step
- ✅ "Add Selected Movies" imports checked movies only
- ✅ Imported movies appear in list immediately
- ✅ Modal closes after successful import

#### Error Handling:
- ✅ Shows specific error if barcode found but not matched
- ✅ Shows helpful message if no barcode or disc case detected
- ✅ Suggests retaking photo with better lighting/angle
- ✅ File cleanup on error

---

### Camera Capture
**Location**: "📸 Take Photo" button in import modal
**Requirements**: HTTPS on mobile devices, localhost acceptable

#### Test Cases:
- ✅ Opens camera preview on supported devices
- ✅ Prefers rear camera for barcode scanning
- ✅ Shows camera preview in modal
- ✅ Capture button takes photo and proceeds to analysis
- ✅ Cancel button stops camera and returns to upload options
- ✅ Camera stream stops when modal closes
- ✅ Shows error on mobile HTTP (not HTTPS)
- ✅ Falls back to upload option on camera error
- ✅ Handles camera permission denial gracefully

#### Browser Compatibility:
- Works on localhost (HTTP)
- Requires HTTPS on remote access
- Supported browsers: Chrome, Safari, Edge, Firefox

---

## Barcode Scanning

### Barcode Detection and Lookup
**Trigger**: Photo import with barcode visible
**Services**: Anthropic Vision API + UPCitemdb + TMDb

#### Test Cases:
- ✅ Detects UPC-A barcodes (12 digits)
- ✅ Detects EAN-13 barcodes (13 digits)
- ✅ Detects ISBN barcodes (10 or 13 digits)
- ✅ Validates barcode format before lookup
- ✅ Looks up product info from UPCitemdb
- ✅ Searches TMDb for movie metadata
- ✅ Returns movie with title, format, genre, release date, actors
- ✅ Shows barcode number in error if detected but not matched
- ✅ Falls back to AI disc case analysis if barcode fails
- ✅ Logs detection attempts with ✓/✗ symbols

#### Barcode Detection Flow:
1. AI analyzes image for barcode
2. Extracts barcode number and type
3. Validates barcode format (8-14 numeric digits)
4. Looks up UPC in product database
5. Searches TMDb for movie details
6. Returns combined metadata with confidence: 1.0

#### Success Response:
```json
{
  "success": true,
  "barcode": "012345678901",
  "barcodeType": "UPC-A",
  "movie": {
    "title": "Movie Title",
    "format": "Blu-ray",
    "genre": "Action",
    "releaseDate": "2010",
    "actors": "Actor 1, Actor 2",
    "notes": ""
  }
}
```

#### Error Response:
```json
{
  "success": false,
  "error": "No barcode detected",
  "barcode": null
}
```

---

## Export Features

### Export to JSON
**Location**: Export dropdown → "Export JSON"
**Filename Format**: `movie-collection-YYYY-MM-DDTHH-MM-SS.json`

#### Test Cases:
- ✅ Downloads JSON file with all movies
- ✅ Filename includes current date and time
- ✅ JSON is formatted with 2-space indentation
- ✅ Includes all movie fields
- ✅ File downloads automatically
- ✅ Works with filtered/searched results (exports all)

#### JSON Structure:
```json
{
  "movies": [
    {
      "id": "uuid",
      "title": "Movie Title",
      "format": "bluray",
      "notes": "Notes text",
      "genre": "Action",
      "releaseDate": "2010",
      "actors": "Actor 1, Actor 2",
      "wantToUpgrade": false,
      "upgradeTarget": null,
      "dateAdded": "2024-01-01T12:00:00.000Z",
      "dateModified": "2024-01-01T12:00:00.000Z",
      "source": "manual",
      "sourceFile": null
    }
  ]
}
```

---

### Export to CSV
**Location**: Export dropdown → "Export CSV"
**Filename Format**: `movie-collection-YYYY-MM-DDTHH-MM-SS.csv`

#### Test Cases:
- ✅ Downloads CSV file with all movies
- ✅ Filename includes current date and time
- ✅ Includes header row
- ✅ All fields are included
- ✅ Commas in data are properly escaped
- ✅ File downloads automatically
- ✅ Works with filtered/searched results (exports all)

#### CSV Columns:
- Title
- Format
- Genre
- Release Date
- Actors
- Notes
- Want to Upgrade
- Upgrade Target
- Date Added
- Date Modified

---

## Security Features

### CSRF Protection
**Implementation**: Token-based CSRF validation
**Applied to**: All POST, PUT, DELETE requests

#### Test Cases:
- ✅ CSRF token generated on login
- ✅ Token included in X-CSRF-Token header
- ✅ Requests without token are rejected (403)
- ✅ Requests with invalid token are rejected (403)
- ✅ Token persists in session
- ✅ GET requests bypass CSRF check
- ✅ Token endpoint `/api/auth/csrf` returns token for authenticated users

---

### File Upload Validation
**Implementation**: Magic byte validation + MIME type + extension check

#### Test Cases:
- ✅ Validates file extension (.jpg, .jpeg, .png, .gif, .webp)
- ✅ Validates MIME type from Content-Type header
- ✅ Validates file content using magic bytes (file signature)
- ✅ Rejects files with mismatched signatures
- ✅ Rejects executable files disguised as images
- ✅ File size limited to 20MB
- ✅ Uploaded files cleaned up on error

---

### Input Validation
**Implementation**: Allowlist-based validation

#### Test Cases:
- ✅ sortBy parameter validated against allowlist
- ✅ format parameter validated against allowlist
- ✅ upgradeTarget parameter validated against allowlist
- ✅ releaseDate validated as 4-digit year
- ✅ Invalid values use safe defaults
- ✅ No property injection possible
- ✅ Title length capped at 500 chars
- ✅ Notes length capped at 2000 chars

#### Allowlists:
- `ALLOWED_SORT_FIELDS`: title, format, genre, releaseDate, actors, notes, dateAdded, dateModified
- `ALLOWED_FORMATS`: dvd, bluray, 4k, mixed, bluray_4k
- `ALLOWED_UPGRADE_TARGETS`: 4k, bluray, null

---

### Safe Redirects
**Implementation**: Path allowlist

#### Test Cases:
- ✅ Only allows redirects to `/` and `/login`
- ✅ Redirects to `/` if path not in allowlist
- ✅ Query strings allowed on allowlisted paths
- ✅ Logs warning on disallowed redirect attempt

---

### Session Management
**Implementation**: In-memory session store with expiration

#### Test Cases:
- ✅ Session ID is 64-character hex string
- ✅ Session cookie is HttpOnly
- ✅ Session cookie is SameSite=Strict
- ✅ Session cookie is Secure in production
- ✅ Session expires after 30 days
- ✅ Expired sessions cleaned up hourly
- ✅ Session required for authenticated endpoints
- ✅ Invalid session returns 401

---

## UI Components

### Statistics Display
**Location**: Header area

#### Test Cases:
- ✅ Shows total movie count
- ✅ Shows count by format (DVD, Blu-ray, 4K)
- ✅ Shows count of movies marked for upgrade
- ✅ Updates in real-time when movies added/deleted
- ✅ Updates when filters applied (shows filtered count)

---

### Format Badges
**Locations**: Movie cards, details modal

#### Test Cases:
- ✅ DVD badge is orange (#e67e22)
- ✅ Blu-ray badge is blue (#3498db)
- ✅ 4K badge is purple (#9b59b6)
- ✅ Mixed badge is green (#27ae60)
- ✅ Badge text is white
- ✅ Badge has uppercase text
- ✅ Badge has rounded corners

---

### Upgrade Badge
**Location**: Movie cards with wantToUpgrade=true

#### Test Cases:
- ✅ Shows "Wants Upgrade" badge in gold (#f39c12)
- ✅ Only visible on movies marked for upgrade
- ✅ Displays upgrade target (4K or Blu-ray) in details

---

### Empty State
**Location**: Movie list when no results

#### Test Cases:
- ✅ Shows when no movies in collection
- ✅ Shows when search returns no results
- ✅ Shows when filter returns no results
- ✅ Displays helpful message based on context
- ✅ Message: "No movies in your collection yet. Click 'Add Movie' to get started."
- ✅ Message: "No movies found matching your search."

---

## API Endpoints

### Movies API

#### `GET /api/movies`
- Query params: search, format, wantToUpgrade, sortBy, sortOrder
- Returns: `{ movies: Movie[] }`
- Auth: Required (if password configured)
- CSRF: Not required (GET)

#### `GET /api/movies/stats`
- Returns: `{ total, byFormat: { dvd, bluray, 4k, mixed }, wantToUpgrade }`
- Auth: Required (if password configured)
- CSRF: Not required (GET)

#### `GET /api/movies/:id`
- Returns: `Movie`
- Auth: Required (if password configured)
- CSRF: Not required (GET)

#### `POST /api/movies`
- Body: Movie data (without id, dateAdded, dateModified)
- Returns: Created movie
- Auth: Required (if password configured)
- CSRF: Required

#### `PUT /api/movies/:id`
- Body: Partial movie data
- Returns: Updated movie
- Auth: Required (if password configured)
- CSRF: Required

#### `DELETE /api/movies/:id`
- Returns: `{ success: true }`
- Auth: Required (if password configured)
- CSRF: Required

#### `GET /api/movies/export?format=json|csv`
- Returns: JSON or CSV download
- Auth: Required (if password configured)
- CSRF: Not required (GET)

---

### Import API

#### `POST /api/import/upload`
- Body: multipart/form-data with photo file
- Returns: `{ success, fileName, movies: Movie[], count, debug }`
- Auth: Required (if password configured)
- CSRF: Required
- File validation: Magic bytes + MIME type + extension

#### `POST /api/import/confirm`
- Body: `{ movies: Movie[], fileName: string }`
- Returns: `{ success, added, movies: Movie[] }`
- Auth: Required (if password configured)
- CSRF: Required

#### `POST /api/import/barcode`
- Body: multipart/form-data with barcode photo
- Returns: `{ success, barcode, barcodeType, movie: Movie }`
- Auth: Required (if password configured)
- CSRF: Required
- Note: Separate endpoint, not typically used directly (integrated into /upload)

---

### Auth API

#### `GET /api/auth/csrf`
- Returns: `{ token: string }`
- Auth: Required
- CSRF: Not required (GET)

#### `POST /api/auth/login`
- Body: `{ password: string }`
- Returns: Redirect to / or /login?error=1
- Auth: Not required
- CSRF: Not required
- Rate limit: 5 requests per 15 minutes

#### `POST /api/auth/logout`
- Returns: Redirect to /login
- Auth: Required
- CSRF: Not required (logout endpoint)

---

## Environment Configuration

### Required Environment Variables
- `ANTHROPIC_API_KEY` - Required for AI photo analysis and barcode detection
- `TMDB_API_KEY` - Optional for enhanced movie metadata lookup

### Optional Environment Variables
- `APP_PASSWORD` - If set, enables authentication requirement
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Set to 'production' for production mode

---

## Data Storage

### File: `data/movies.json`
**Structure**:
```json
{
  "movies": [Movie],
  "version": 1
}
```

### Backups
**Location**: `data/backups/`
**Format**: `movies-backup-TIMESTAMP.json`
**Trigger**: Before each save operation

---

## Test Scenarios for Playwright

### Critical User Flows

1. **New User Onboarding**
   - Visit app
   - See empty state
   - Add first movie manually
   - Verify it appears in list

2. **Photo Import Flow**
   - Click "Import from Photo"
   - Upload photo of disc cases
   - Review detected movies
   - Edit any incorrect data
   - Import selected movies
   - Verify they appear in collection

3. **Barcode Scanning Flow**
   - Click "Import from Photo"
   - Upload photo of barcode
   - Verify movie detected via barcode
   - Import movie
   - Verify metadata is complete (genre, actors, etc.)

4. **Search and Filter Flow**
   - Search for movie by title
   - Filter by format
   - Enable "Wants Upgrade" filter
   - Change sort order
   - Verify results update correctly

5. **Complete CRUD Cycle**
   - Add new movie
   - View details
   - Edit movie
   - Delete movie
   - Verify each step

6. **Export Flow**
   - Add several movies
   - Export to JSON
   - Export to CSV
   - Verify file downloads and content

7. **Authentication Flow** (when enabled)
   - Logout
   - Attempt to access app (redirected to login)
   - Login with wrong password (error shown)
   - Login with correct password (access granted)
   - Session persists across page refresh

---

## Performance Expectations

- Page load: < 2 seconds
- Search debounce: 300ms
- Photo analysis: 5-15 seconds (AI processing)
- Barcode detection: 3-10 seconds
- Movie operations (CRUD): < 500ms
- Export generation: < 2 seconds for 1000 movies

---

## Browser Compatibility

### Supported Browsers
- Chrome/Edge 90+
- Safari 14+
- Firefox 88+

### Mobile Support
- iOS Safari 14+
- Chrome Android 90+

### Camera Features
- HTTPS required for camera on mobile (except localhost)
- Rear camera preferred for barcode scanning

---

## Known Limitations

1. **Camera on Mobile HTTP**: Camera access requires HTTPS when accessing via IP address. Works on localhost or HTTPS deployment.

2. **Barcode Detection**: UPCitemdb trial API has rate limits. Barcode detection may fail for unknown UPCs.

3. **AI Analysis Accuracy**: Depends on photo quality, lighting, and visibility of disc cases.

4. **Session Storage**: In-memory sessions are lost on server restart (not suitable for production without Redis).

5. **File Size**: 20MB upload limit for photos.

---

## Success Metrics

### For Testing
- ✅ All critical user flows complete without errors
- ✅ All CRUD operations work correctly
- ✅ Search and filters produce accurate results
- ✅ Photo import successfully detects movies
- ✅ Barcode scanning returns correct movie data
- ✅ Export files contain complete data
- ✅ Authentication blocks unauthorized access
- ✅ CSRF protection prevents attacks
- ✅ File validation rejects malicious uploads
- ✅ UI is responsive on mobile and desktop
