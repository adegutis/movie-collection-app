// DOM Elements
const movieList = document.getElementById('movie-list');
const statsEl = document.getElementById('stats');
const searchInput = document.getElementById('search');
const formatFilter = document.getElementById('format-filter');
const upgradeFilter = document.getElementById('upgrade-filter');
const sortBy = document.getElementById('sort-by');
const addMovieBtn = document.getElementById('add-movie-btn');
const viewListBtn = document.getElementById('view-list');
const viewGridBtn = document.getElementById('view-grid');
const importPhotoBtn = document.getElementById('import-photo-btn');
const exportBtn = document.getElementById('export-btn');
const exportMenu = document.getElementById('export-menu');
const exportJsonBtn = document.getElementById('export-json');
const exportCsvBtn = document.getElementById('export-csv');

// Modal elements
const movieModal = document.getElementById('movie-modal');
const deleteModal = document.getElementById('delete-modal');
const modalTitle = document.getElementById('modal-title');
const movieForm = document.getElementById('movie-form');
const closeModalBtn = document.getElementById('close-modal');
const cancelBtn = document.getElementById('cancel-btn');
const cancelDelete = document.getElementById('cancel-delete');
const confirmDelete = document.getElementById('confirm-delete');
const deleteMovieTitle = document.getElementById('delete-movie-title');

// Details modal elements
const detailsModal = document.getElementById('details-modal');
const closeDetailsBtn = document.getElementById('close-details');
const detailsTitle = document.getElementById('details-title');
const detailsFormat = document.getElementById('details-format');
const detailsGenre = document.getElementById('details-genre');
const detailsGenreRow = document.getElementById('details-genre-row');
const detailsRelease = document.getElementById('details-release');
const detailsReleaseRow = document.getElementById('details-release-row');
const detailsActors = document.getElementById('details-actors');
const detailsActorsRow = document.getElementById('details-actors-row');
const detailsNotes = document.getElementById('details-notes');
const detailsNotesRow = document.getElementById('details-notes-row');
const detailsUpgrade = document.getElementById('details-upgrade');
const detailsUpgradeRow = document.getElementById('details-upgrade-row');
const detailsEditBtn = document.getElementById('details-edit-btn');
const detailsDeleteBtn = document.getElementById('details-delete-btn');

// Import modal elements
const importModal = document.getElementById('import-modal');
const closeImportBtn = document.getElementById('close-import');
const uploadArea = document.getElementById('upload-area');
const photoInput = document.getElementById('photo-input');
const uploadStep = document.getElementById('upload-step');
const analyzingStep = document.getElementById('analyzing-step');
const resultsStep = document.getElementById('results-step');
const errorStep = document.getElementById('error-step');
const resultsList = document.getElementById('results-list');
const resultsCount = document.getElementById('results-count');
const errorMessage = document.getElementById('error-message');
const importCancel = document.getElementById('import-cancel');
const importAnother = document.getElementById('import-another');
const importConfirm = document.getElementById('import-confirm');
const errorClose = document.getElementById('error-close');

// Form elements
const movieIdInput = document.getElementById('movie-id');
const titleInput = document.getElementById('title');
const formatInput = document.getElementById('format');
const notesInput = document.getElementById('notes');
const genreInput = document.getElementById('genre');
const releaseDateInput = document.getElementById('release-date');
const actorsInput = document.getElementById('actors');
const wantUpgradeInput = document.getElementById('want-upgrade');
const upgradeTargetInput = document.getElementById('upgrade-target');

// State
let currentFilters = {
  search: '',
  format: '',
  wantToUpgrade: undefined,
  sortBy: 'title'
};
let currentView = 'list'; // 'list' or 'grid'
let deleteMovieId = null;
let debounceTimer = null;
let importResults = null;
let importFileName = null;
let currentDetailsMovie = null;

// Format display names
const formatNames = {
  dvd: 'DVD',
  bluray: 'Blu-ray',
  '4k': '4K Ultra HD',
  mixed: 'Mixed',
  bluray_4k: 'Blu-ray + 4K'
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setView('list'); // Default to list view
  loadMovies();
  loadStats();
  setupEventListeners();
});

function setupEventListeners() {
  // Search with debounce
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      currentFilters.search = searchInput.value;
      loadMovies();
    }, 300);
  });

  // Filters
  formatFilter.addEventListener('change', () => {
    currentFilters.format = formatFilter.value;
    loadMovies();
  });

  upgradeFilter.addEventListener('change', () => {
    currentFilters.wantToUpgrade = upgradeFilter.checked ? true : undefined;
    loadMovies();
  });

  sortBy.addEventListener('change', () => {
    currentFilters.sortBy = sortBy.value;
    loadMovies();
  });

  // Add movie button
  addMovieBtn.addEventListener('click', () => openModal());

  // Movie card clicks (event delegation)
  movieList.addEventListener('click', (e) => {
    const card = e.target.closest('.movie-card');
    if (card) {
      const movieId = card.dataset.id;
      if (movieId) showMovieDetails(movieId);
    }
  });

  // Modal controls
  closeModalBtn.addEventListener('click', () => closeModal());
  cancelBtn.addEventListener('click', () => closeModal());

  // Close modal on backdrop click
  movieModal.addEventListener('click', (e) => {
    if (e.target === movieModal) closeModal();
  });

  // Form submission
  movieForm.addEventListener('submit', handleFormSubmit);

  // Upgrade checkbox toggle
  wantUpgradeInput.addEventListener('change', () => {
    upgradeTargetInput.disabled = !wantUpgradeInput.checked;
  });

  // Delete modal controls
  cancelDelete.addEventListener('click', () => {
    deleteModal.classList.remove('active');
    deleteMovieId = null;
  });

  confirmDelete.addEventListener('click', handleDelete);

  deleteModal.addEventListener('click', (e) => {
    if (e.target === deleteModal) {
      deleteModal.classList.remove('active');
      deleteMovieId = null;
    }
  });

  // View toggle
  viewListBtn.addEventListener('click', () => setView('list'));
  viewGridBtn.addEventListener('click', () => setView('grid'));

  // Details modal
  closeDetailsBtn.addEventListener('click', closeDetailsModal);
  detailsModal.addEventListener('click', (e) => {
    if (e.target === detailsModal) closeDetailsModal();
  });

  // Close modals with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (detailsModal.classList.contains('active')) closeDetailsModal();
      if (movieModal.classList.contains('active')) closeModal();
      if (deleteModal.classList.contains('active')) {
        deleteModal.classList.remove('active');
        deleteMovieId = null;
      }
      if (importModal.classList.contains('active')) closeImportModal();
    }
  });
  detailsEditBtn.addEventListener('click', () => {
    const movieToEdit = currentDetailsMovie;
    closeDetailsModal();
    if (movieToEdit) {
      openModal(movieToEdit);
    }
  });
  detailsDeleteBtn.addEventListener('click', () => {
    if (currentDetailsMovie) {
      const movieToDelete = currentDetailsMovie;
      closeDetailsModal();
      confirmDeleteMovie(movieToDelete.id, movieToDelete.title);
    }
  });

  // Import modal
  importPhotoBtn.addEventListener('click', openImportModal);
  closeImportBtn.addEventListener('click', closeImportModal);
  importModal.addEventListener('click', (e) => {
    if (e.target === importModal) closeImportModal();
  });

  // Upload area
  uploadArea.addEventListener('click', () => photoInput.click());
  photoInput.addEventListener('change', handleFileSelect);

  // Drag and drop
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
  });
  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('drag-over');
  });
  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  });

  // Import actions
  importCancel.addEventListener('click', closeImportModal);
  importAnother.addEventListener('click', resetImportModal);
  importConfirm.addEventListener('click', confirmImport);
  errorClose.addEventListener('click', closeImportModal);

  // Export dropdown
  exportBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    exportMenu.classList.toggle('active');
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', () => {
    exportMenu.classList.remove('active');
  });

  // Export actions
  exportJsonBtn.addEventListener('click', () => {
    exportMenu.classList.remove('active');
    downloadJSON();
  });

  exportCsvBtn.addEventListener('click', () => {
    exportMenu.classList.remove('active');
    downloadCSV();
  });
}

function setView(view) {
  currentView = view;

  if (view === 'list') {
    movieList.classList.add('list-view');
    viewListBtn.classList.add('active');
    viewGridBtn.classList.remove('active');
  } else {
    movieList.classList.remove('list-view');
    viewGridBtn.classList.add('active');
    viewListBtn.classList.remove('active');
  }
}

async function loadMovies() {
  try {
    const data = await API.getMovies(currentFilters);
    renderMovies(data.movies);
  } catch (error) {
    console.error('Failed to load movies:', error);
  }
}

async function loadStats() {
  try {
    const stats = await API.getStats();
    renderStats(stats);
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}

function renderStats(stats) {
  statsEl.innerHTML = `
    <span>Total: <strong>${stats.total}</strong></span>
    <span style="color: var(--dvd)">DVD: ${stats.byFormat.dvd}</span>
    <span style="color: var(--bluray)">Blu-ray: ${stats.byFormat.bluray}</span>
    <span style="color: var(--4k)">4K: ${stats.byFormat['4k']}</span>
    ${stats.wantToUpgrade > 0 ? `<span style="color: var(--upgrade)">To Upgrade: ${stats.wantToUpgrade}</span>` : ''}
  `;
}

function renderMovies(movies) {
  if (movies.length === 0) {
    movieList.innerHTML = `
      <div class="empty-state">
        <h3>No movies found</h3>
        <p>Try adjusting your filters or add a new movie</p>
      </div>
    `;
    return;
  }

  movieList.innerHTML = movies.map(movie => `
    <div class="movie-card" data-id="${movie.id}">
      <div class="movie-header">
        <span class="movie-title">${escapeHtml(movie.title)}</span>
      </div>
      <div class="movie-meta">
        <span class="format-badge format-${movie.format}">${formatNames[movie.format] || movie.format}</span>
        ${movie.wantToUpgrade ? `<span class="upgrade-badge">Upgrade</span>` : ''}
      </div>
      ${movie.notes ? `<div class="movie-notes">${escapeHtml(movie.notes)}</div>` : ''}
    </div>
  `).join('');
}

function openModal(movie = null) {
  if (movie) {
    modalTitle.textContent = 'Edit Movie';
    movieIdInput.value = movie.id;
    titleInput.value = movie.title;
    formatInput.value = movie.format;
    notesInput.value = movie.notes || '';
    genreInput.value = movie.genre || '';
    releaseDateInput.value = movie.releaseDate || '';
    actorsInput.value = movie.actors || '';
    wantUpgradeInput.checked = movie.wantToUpgrade;
    upgradeTargetInput.value = movie.upgradeTarget || '4k';
    upgradeTargetInput.disabled = !movie.wantToUpgrade;
  } else {
    modalTitle.textContent = 'Add Movie';
    movieForm.reset();
    movieIdInput.value = '';
    upgradeTargetInput.disabled = true;
  }

  movieModal.classList.add('active');
  titleInput.focus();
}

function closeModal() {
  movieModal.classList.remove('active');
  movieForm.reset();
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const data = {
    title: titleInput.value.trim(),
    format: formatInput.value,
    notes: notesInput.value.trim(),
    genre: genreInput.value.trim(),
    releaseDate: releaseDateInput.value.trim(),
    actors: actorsInput.value.trim(),
    wantToUpgrade: wantUpgradeInput.checked,
    upgradeTarget: wantUpgradeInput.checked ? upgradeTargetInput.value : null
  };

  try {
    if (movieIdInput.value) {
      await API.updateMovie(movieIdInput.value, data);
    } else {
      await API.createMovie(data);
    }

    closeModal();
    loadMovies();
    loadStats();
  } catch (error) {
    console.error('Failed to save movie:', error);
    alert('Failed to save movie. Please try again.');
  }
}

async function editMovie(id) {
  try {
    const res = await fetch(`/api/movies/${id}`);
    const movie = await res.json();
    openModal(movie);
  } catch (error) {
    console.error('Failed to load movie:', error);
  }
}

function confirmDeleteMovie(id, title) {
  deleteMovieId = id;
  deleteMovieTitle.textContent = title;
  deleteModal.classList.add('active');
}

async function handleDelete() {
  if (!deleteMovieId) return;

  try {
    await API.deleteMovie(deleteMovieId);
    deleteModal.classList.remove('active');
    deleteMovieId = null;
    loadMovies();
    loadStats();
  } catch (error) {
    console.error('Failed to delete movie:', error);
    alert('Failed to delete movie. Please try again.');
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Details modal functions
async function showMovieDetails(id) {
  try {
    const res = await fetch(`/api/movies/${id}`);
    const movie = await res.json();
    currentDetailsMovie = movie;

    detailsTitle.textContent = movie.title;
    detailsFormat.innerHTML = `<span class="format-badge format-${movie.format}">${formatNames[movie.format] || movie.format}</span>`;

    // Show/hide rows based on data
    if (movie.genre) {
      detailsGenre.textContent = movie.genre;
      detailsGenreRow.style.display = 'flex';
    } else {
      detailsGenreRow.style.display = 'none';
    }

    if (movie.releaseDate) {
      detailsRelease.textContent = movie.releaseDate;
      detailsReleaseRow.style.display = 'flex';
    } else {
      detailsReleaseRow.style.display = 'none';
    }

    if (movie.actors) {
      detailsActors.textContent = movie.actors;
      detailsActorsRow.style.display = 'flex';
    } else {
      detailsActorsRow.style.display = 'none';
    }

    if (movie.notes) {
      detailsNotes.textContent = movie.notes;
      detailsNotesRow.style.display = 'flex';
    } else {
      detailsNotesRow.style.display = 'none';
    }

    if (movie.wantToUpgrade) {
      detailsUpgrade.textContent = `To ${formatNames[movie.upgradeTarget] || 'Blu-ray'}`;
      detailsUpgradeRow.style.display = 'flex';
    } else {
      detailsUpgradeRow.style.display = 'none';
    }

    detailsModal.classList.add('active');
  } catch (error) {
    console.error('Failed to load movie details:', error);
  }
}

function closeDetailsModal() {
  detailsModal.classList.remove('active');
  currentDetailsMovie = null;
}

// Import functions
function openImportModal() {
  resetImportModal();
  importModal.classList.add('active');
}

function closeImportModal() {
  importModal.classList.remove('active');
  resetImportModal();
}

function resetImportModal() {
  uploadStep.style.display = 'block';
  analyzingStep.style.display = 'none';
  resultsStep.style.display = 'none';
  errorStep.style.display = 'none';
  photoInput.value = '';
  importResults = null;
  importFileName = null;
}

function showImportStep(step) {
  uploadStep.style.display = step === 'upload' ? 'block' : 'none';
  analyzingStep.style.display = step === 'analyzing' ? 'block' : 'none';
  resultsStep.style.display = step === 'results' ? 'block' : 'none';
  errorStep.style.display = step === 'error' ? 'block' : 'none';
}

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) {
    handleFile(file);
  }
}

async function handleFile(file) {
  // Validate file type
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    showImportError('Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.');
    return;
  }

  // Validate file size (20MB)
  if (file.size > 20 * 1024 * 1024) {
    showImportError('File too large. Maximum size is 20MB.');
    return;
  }

  showImportStep('analyzing');

  const formData = new FormData();
  formData.append('photo', file);

  try {
    const res = await fetch('/api/import/upload', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();

    if (!res.ok) {
      if (data.needsSetup) {
        showImportError(data.error, true);
      } else {
        showImportError(data.error || 'Failed to analyze photo');
      }
      return;
    }

    if (data.movies.length === 0) {
      showImportError('No movies detected in this photo. Try a clearer image with visible disc case spines.');
      return;
    }

    importResults = data.movies;
    importFileName = data.fileName;
    showResults(data.movies);
  } catch (error) {
    console.error('Upload error:', error);
    showImportError('Failed to upload photo. Please try again.');
  }
}

function showImportError(message, showHelp = false) {
  errorMessage.textContent = message;
  document.getElementById('error-help').style.display = showHelp ? 'inline-block' : 'none';
  showImportStep('error');
}

function showResults(movies) {
  const newCount = movies.filter(m => !m.isDuplicate).length;
  const dupCount = movies.filter(m => m.isDuplicate).length;

  resultsCount.textContent = `${newCount} new, ${dupCount} duplicate${dupCount !== 1 ? 's' : ''}`;

  resultsList.innerHTML = movies.map((movie, index) => `
    <div class="result-item ${movie.isDuplicate ? 'duplicate' : ''}">
      <input type="checkbox"
             id="movie-${index}"
             ${movie.isDuplicate ? '' : 'checked'}
             data-index="${index}">
      <div class="result-info">
        <div class="result-title">${escapeHtml(movie.title)}</div>
        <div class="result-meta">
          <span>${movie.format}</span>
          ${movie.releaseDate ? `<span>${escapeHtml(movie.releaseDate)}</span>` : ''}
          ${movie.genre ? `<span>${escapeHtml(movie.genre)}</span>` : ''}
          ${movie.notes ? `<span>${escapeHtml(movie.notes)}</span>` : ''}
          ${movie.isDuplicate ? `<span class="result-badge duplicate">Duplicate</span>` : ''}
          ${movie.confidence < 0.8 ? `<span class="result-badge low-confidence">Low confidence</span>` : ''}
        </div>
      </div>
    </div>
  `).join('');

  showImportStep('results');
}

async function confirmImport() {
  const checkboxes = resultsList.querySelectorAll('input[type="checkbox"]');
  const moviesToAdd = [];

  checkboxes.forEach((cb) => {
    const index = parseInt(cb.dataset.index);
    const movie = importResults[index];
    if (cb.checked) {
      moviesToAdd.push({
        title: movie.title,
        format: normalizeFormat(movie.format),
        notes: movie.notes || '',
        genre: movie.genre || '',
        releaseDate: movie.releaseDate || '',
        actors: movie.actors || ''
      });
    }
  });

  if (moviesToAdd.length === 0) {
    closeImportModal();
    return;
  }

  try {
    const res = await fetch('/api/import/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        movies: moviesToAdd,
        fileName: importFileName
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to add movies');
    }

    closeImportModal();
    loadMovies();
    loadStats();
  } catch (error) {
    console.error('Confirm error:', error);
    alert('Failed to add movies. Please try again.');
  }
}

function normalizeFormat(format) {
  if (!format) return 'dvd';
  const f = format.toLowerCase();
  if (f.includes('4k')) return '4k';
  if (f.includes('blu')) return 'bluray';
  return 'dvd';
}

// Export functions
async function downloadJSON() {
  try {
    const res = await fetch('/api/movies/export?format=json');
    const data = await res.json();

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `movie-collection-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to download JSON:', error);
    alert('Failed to download JSON. Please try again.');
  }
}

async function downloadCSV() {
  try {
    const res = await fetch('/api/movies/export?format=csv');
    const csv = await res.text();

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `movie-collection-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to download CSV:', error);
    alert('Failed to download CSV. Please try again.');
  }
}
