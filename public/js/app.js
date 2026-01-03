// DOM Elements
const movieList = document.getElementById('movie-list');
const statsEl = document.getElementById('stats');
const searchInput = document.getElementById('search');
const formatFilter = document.getElementById('format-filter');
const upgradeFilter = document.getElementById('upgrade-filter');
const sortBy = document.getElementById('sort-by');
const sortOrderBtn = document.getElementById('sort-order-btn');
const sortOrderIcon = document.getElementById('sort-order-icon');
const addMovieBtn = document.getElementById('add-movie-btn');
const viewListBtn = document.getElementById('view-list');
const viewGridBtn = document.getElementById('view-grid');
const importPhotoBtn = document.getElementById('import-photo-btn');
const exportBtn = document.getElementById('export-btn');
const exportMenu = document.getElementById('export-menu');
const exportJsonBtn = document.getElementById('export-json');
const exportCsvBtn = document.getElementById('export-csv');
const columnSelectorContainer = document.getElementById('column-selector-container');
const columnSelectorBtn = document.getElementById('column-selector-btn');
const columnSelectorMenu = document.getElementById('column-selector-menu');
const colFormatCheckbox = document.getElementById('col-format');
const colGenreCheckbox = document.getElementById('col-genre');
const colReleaseCheckbox = document.getElementById('col-release');
const colActorsCheckbox = document.getElementById('col-actors');
const colNotesCheckbox = document.getElementById('col-notes');

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
const cameraStep = document.getElementById('camera-step');
const resultsList = document.getElementById('results-list');
const resultsCount = document.getElementById('results-count');
const errorMessage = document.getElementById('error-message');
const importCancel = document.getElementById('import-cancel');
const importAnother = document.getElementById('import-another');
const importConfirm = document.getElementById('import-confirm');
const errorClose = document.getElementById('error-close');
const takePhotoBtn = document.getElementById('take-photo-btn');
const uploadPhotoBtn = document.getElementById('upload-photo-btn');
const cameraPreview = document.getElementById('camera-preview');
const cameraCanvas = document.getElementById('camera-canvas');
const cameraCancel = document.getElementById('camera-cancel');
const cameraCapture = document.getElementById('camera-capture');

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
  sortBy: 'title',
  sortOrder: 'asc'
};
let currentView = 'list'; // 'list' or 'grid'
let visibleColumns = {
  format: true,
  genre: false,
  release: true,
  actors: false,
  notes: false
};
let columnOrder = ['title', 'genre', 'release', 'actors', 'notes', 'format'];
let draggedColumn = null;
let deleteMovieId = null;
let debounceTimer = null;
let importResults = null;
let importFileName = null;
let currentDetailsMovie = null;
let cameraStream = null;

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
  loadColumnPreferences(); // Load saved column preferences
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

  sortOrderBtn.addEventListener('click', () => {
    currentFilters.sortOrder = currentFilters.sortOrder === 'asc' ? 'desc' : 'asc';
    sortOrderIcon.textContent = currentFilters.sortOrder === 'asc' ? '▲' : '▼';
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

  // Column selector
  columnSelectorBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    exportMenu.classList.remove('active'); // Close export menu
    columnSelectorMenu.classList.toggle('active');
  });

  // Close column selector when clicking outside
  document.addEventListener('click', (e) => {
    if (!columnSelectorContainer.contains(e.target)) {
      columnSelectorMenu.classList.remove('active');
    }
    if (!exportBtn.contains(e.target) && !exportMenu.contains(e.target)) {
      exportMenu.classList.remove('active');
    }
  });

  // Column checkboxes
  colFormatCheckbox.addEventListener('change', () => {
    visibleColumns.format = colFormatCheckbox.checked;
    saveColumnPreferences();
    refreshMovies();
  });

  colGenreCheckbox.addEventListener('change', () => {
    visibleColumns.genre = colGenreCheckbox.checked;
    saveColumnPreferences();
    refreshMovies();
  });

  colReleaseCheckbox.addEventListener('change', () => {
    visibleColumns.release = colReleaseCheckbox.checked;
    saveColumnPreferences();
    refreshMovies();
  });

  colActorsCheckbox.addEventListener('change', () => {
    visibleColumns.actors = colActorsCheckbox.checked;
    saveColumnPreferences();
    refreshMovies();
  });

  colNotesCheckbox.addEventListener('change', () => {
    visibleColumns.notes = colNotesCheckbox.checked;
    saveColumnPreferences();
    refreshMovies();
  });

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

  // Upload options
  takePhotoBtn.addEventListener('click', startCamera);
  uploadPhotoBtn.addEventListener('click', () => {
    uploadArea.style.display = 'block';
    uploadArea.click();
  });

  // Camera controls
  cameraCancel.addEventListener('click', stopCameraAndReset);
  cameraCapture.addEventListener('click', capturePhoto);

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
    columnSelectorMenu.classList.remove('active'); // Close column selector
    exportMenu.classList.toggle('active');
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
    columnSelectorContainer.style.display = 'block';
  } else {
    movieList.classList.remove('list-view');
    viewGridBtn.classList.add('active');
    viewListBtn.classList.remove('active');
    columnSelectorContainer.style.display = 'none';
    columnSelectorMenu.classList.remove('active');
  }

  refreshMovies();
}

function saveColumnPreferences() {
  localStorage.setItem('columnPreferences', JSON.stringify(visibleColumns));
  localStorage.setItem('columnOrder', JSON.stringify(columnOrder));
}

function loadColumnPreferences() {
  const saved = localStorage.getItem('columnPreferences');
  const savedOrder = localStorage.getItem('columnOrder');

  if (savedOrder) {
    try {
      columnOrder = JSON.parse(savedOrder);
    } catch (e) {
      console.error('Failed to load column order:', e);
    }
  }

  if (saved) {
    try {
      visibleColumns = JSON.parse(saved);
      // Update checkboxes to match loaded preferences
      colFormatCheckbox.checked = visibleColumns.format;
      colGenreCheckbox.checked = visibleColumns.genre;
      colReleaseCheckbox.checked = visibleColumns.release;
      colActorsCheckbox.checked = visibleColumns.actors;
      colNotesCheckbox.checked = visibleColumns.notes;
    } catch (e) {
      console.error('Failed to load column preferences:', e);
    }
  } else {
    // Set defaults based on screen size for first-time users
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      // Mobile: Title and Format only
      visibleColumns = {
        format: true,
        genre: false,
        release: false,
        actors: false,
        notes: false
      };
    } else {
      // Desktop: Title, Release Date, and Format
      visibleColumns = {
        format: true,
        genre: false,
        release: true,
        actors: false,
        notes: false
      };
    }
    // Update checkboxes to match defaults
    colFormatCheckbox.checked = visibleColumns.format;
    colGenreCheckbox.checked = visibleColumns.genre;
    colReleaseCheckbox.checked = visibleColumns.release;
    colActorsCheckbox.checked = visibleColumns.actors;
    colNotesCheckbox.checked = visibleColumns.notes;
    // Save the defaults
    saveColumnPreferences();
  }
}

function attachColumnDragHandlers() {
  const headers = document.querySelectorAll('.column-header');

  headers.forEach(header => {
    header.addEventListener('dragstart', (e) => {
      draggedColumn = e.target.dataset.column;
      e.target.style.opacity = '0.5';
    });

    header.addEventListener('dragend', (e) => {
      e.target.style.opacity = '1';
    });

    header.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });

    header.addEventListener('drop', (e) => {
      e.preventDefault();
      const targetColumn = e.target.dataset.column;

      if (draggedColumn && targetColumn && draggedColumn !== targetColumn) {
        // Reorder columns
        const draggedIndex = columnOrder.indexOf(draggedColumn);
        const targetIndex = columnOrder.indexOf(targetColumn);

        columnOrder.splice(draggedIndex, 1);
        columnOrder.splice(targetIndex, 0, draggedColumn);

        saveColumnPreferences();
        refreshMovies();
      }
    });
  });
}

function refreshMovies() {
  loadMovies();
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

  const isListView = currentView === 'list';

  if (isListView) {
    const columnConfig = {
      title: { label: 'Title', width: 'minmax(180px, 1.5fr)', visible: true },
      genre: { label: 'Genre', width: 'minmax(120px, 1fr)', visible: visibleColumns.genre },
      release: { label: 'Year', width: 'minmax(80px, 0.8fr)', visible: visibleColumns.release },
      actors: { label: 'Actors', width: 'minmax(150px, 1.8fr)', visible: visibleColumns.actors },
      notes: { label: 'Notes', width: 'minmax(120px, 1fr)', visible: visibleColumns.notes },
      format: { label: 'Format', width: 'minmax(120px, auto)', visible: true }
    };

    // Build columns based on order and visibility
    const visibleColumnOrder = columnOrder.filter(col => columnConfig[col].visible);
    const gridTemplate = visibleColumnOrder.map(col => columnConfig[col].width).join(' ');

    // Render column headers
    const headers = visibleColumnOrder.map(col =>
      `<div class="column-header" draggable="true" data-column="${col}">${columnConfig[col].label}</div>`
    ).join('');

    // Render movie rows
    const rows = movies.map(movie => {
      const cells = visibleColumnOrder.map(col => {
        switch(col) {
          case 'title':
            return `<div class="movie-header"><span class="movie-title">${escapeHtml(movie.title)}</span></div>`;
          case 'genre':
            return `<div class="movie-column movie-genre">${movie.genre ? escapeHtml(movie.genre) : '-'}</div>`;
          case 'release':
            return `<div class="movie-column movie-release">${movie.releaseDate ? escapeHtml(movie.releaseDate) : '-'}</div>`;
          case 'actors':
            return `<div class="movie-column movie-actors">${movie.actors ? escapeHtml(movie.actors) : '-'}</div>`;
          case 'notes':
            return `<div class="movie-column movie-notes">${movie.notes ? escapeHtml(movie.notes) : '-'}</div>`;
          case 'format':
            return `<div class="movie-meta">
              ${visibleColumns.format ? `<span class="format-badge format-${movie.format}">${formatNames[movie.format] || movie.format}</span>` : ''}
              ${movie.wantToUpgrade ? `<span class="upgrade-badge">Upgrade</span>` : ''}
            </div>`;
        }
      }).join('');

      return `<div class="movie-card" data-id="${movie.id}" style="grid-template-columns: ${gridTemplate}">${cells}</div>`;
    }).join('');

    movieList.innerHTML = `
      <div class="column-headers" style="grid-template-columns: ${gridTemplate}">${headers}</div>
      ${rows}
    `;

    // Attach drag and drop handlers
    attachColumnDragHandlers();
  } else {
    // Grid view: traditional card layout
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
    const res = await fetch(`/api/movies/${id}`, { credentials: 'same-origin' });
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
    const res = await fetch(`/api/movies/${id}`, { credentials: 'same-origin' });
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
  stopCamera();
  importModal.classList.remove('active');
  resetImportModal();
}

function resetImportModal() {
  uploadStep.style.display = 'block';
  uploadArea.style.display = 'none';
  analyzingStep.style.display = 'none';
  resultsStep.style.display = 'none';
  errorStep.style.display = 'none';
  cameraStep.style.display = 'none';
  photoInput.value = '';
  importResults = null;
  importFileName = null;
  stopCamera();
}

function showImportStep(step) {
  uploadStep.style.display = step === 'upload' ? 'block' : 'none';
  analyzingStep.style.display = step === 'analyzing' ? 'block' : 'none';
  resultsStep.style.display = step === 'results' ? 'block' : 'none';
  errorStep.style.display = step === 'error' ? 'block' : 'none';
  cameraStep.style.display = step === 'camera' ? 'block' : 'none';
}

// Camera functions
async function startCamera() {
  // Check if camera API is available and page is in secure context
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showImportError('Camera not supported. Please use the upload option instead.');
    return;
  }

  // Check if page is in secure context (HTTPS or localhost)
  if (!window.isSecureContext && window.location.hostname !== 'localhost') {
    uploadArea.style.display = 'block';
    showImportError('Camera requires HTTPS on mobile devices. Please use the upload photo option instead, or access via localhost.');
    return;
  }

  try {
    // Request camera access with rear camera preference (better for scanning)
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' }, // Prefer rear camera
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      }
    });

    cameraStream = stream;
    cameraPreview.srcObject = stream;
    showImportStep('camera');
  } catch (error) {
    console.error('Camera access error:', error);

    let errorMsg = 'Could not access camera. ';
    if (error.name === 'NotAllowedError') {
      errorMsg += 'Please allow camera access in your browser settings, or use the upload option.';
    } else if (error.name === 'NotFoundError') {
      errorMsg += 'No camera found on this device. Please use the upload option.';
    } else if (error.name === 'NotReadableError') {
      errorMsg += 'Camera is in use by another app. Please use the upload option.';
    } else {
      errorMsg += 'Please use the upload photo option instead.';
    }

    // Show upload area as fallback
    uploadArea.style.display = 'block';
    showImportError(errorMsg);
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
    cameraPreview.srcObject = null;
  }
}

function stopCameraAndReset() {
  stopCamera();
  resetImportModal();
}

async function capturePhoto() {
  if (!cameraStream) return;

  // Set canvas dimensions to match video
  cameraCanvas.width = cameraPreview.videoWidth;
  cameraCanvas.height = cameraPreview.videoHeight;

  // Draw current video frame to canvas
  const context = cameraCanvas.getContext('2d');
  context.drawImage(cameraPreview, 0, 0);

  // Convert canvas to blob
  cameraCanvas.toBlob(async (blob) => {
    if (!blob) {
      showImportError('Failed to capture photo. Please try again.');
      return;
    }

    // Stop camera
    stopCamera();

    // Create file from blob
    const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });

    // Process the photo using existing handleFile function
    await handleFile(file);
  }, 'image/jpeg', 0.95);
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
    const csrfToken = await API.getCsrfToken();
    const headers = {};
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }

    const res = await fetch('/api/import/upload', {
      method: 'POST',
      headers: headers,
      body: formData,
      credentials: 'same-origin'
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
      let errorMsg = 'No movies detected. ';

      if (data.debug) {
        if (data.debug.barcodeAttempted) {
          if (data.debug.barcodeNumber) {
            errorMsg += `Found barcode ${data.debug.barcodeNumber} but couldn't match to a movie. `;
          } else {
            errorMsg += 'No barcode detected. ';
          }
        }
        errorMsg += 'AI analysis found no disc cases. ';
      }

      errorMsg += '\n\nTry:\n- A clearer, well-lit photo\n- Closer to the barcode or disc case\n- Different angle showing the title clearly';
      showImportError(errorMsg);
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
      headers: await API.getHeaders(),
      body: JSON.stringify({
        movies: moviesToAdd,
        fileName: importFileName
      }),
      credentials: 'same-origin'
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
    const res = await fetch('/api/movies/export?format=json', { credentials: 'same-origin' });
    const data = await res.json();

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    a.download = `movie-collection-${timestamp}.json`;
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
    const res = await fetch('/api/movies/export?format=csv', { credentials: 'same-origin' });
    const csv = await res.text();

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    a.download = `movie-collection-${timestamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to download CSV:', error);
    alert('Failed to download CSV. Please try again.');
  }
}
