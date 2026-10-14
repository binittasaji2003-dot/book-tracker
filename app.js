/**
 * Book Tracker - My Book Shelf
 * Pure Vanilla JavaScript implementation with localStorage persistence,
 * strict input validation, newest-first ordering, live search,
 * in-place status management, XSS protection, and accessibility features.
 */

(function () {
  'use strict';

  // -------------------------------------------------------------------------
  // Constants & Configuration
  // -------------------------------------------------------------------------
  const STORAGE_KEY = 'my_book_shelf_data_v1';
  const VALID_STATUSES = ['To read', 'Reading', 'Finished'];

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------
  /** @type {Array<{id: string, title: string, author: string, status: string, createdAt: number}>} */
  let books = [];
  let pendingDeleteBookId = null;

  // -------------------------------------------------------------------------
  // DOM Elements
  // -------------------------------------------------------------------------
  const elements = {
    // Form & Inputs
    form: document.getElementById('add-book-form'),
    titleInput: document.getElementById('book-title'),
    authorInput: document.getElementById('book-author'),
    statusSelect: document.getElementById('book-status'),
    titleError: document.getElementById('title-error'),
    authorError: document.getElementById('author-error'),

    // Search
    searchInput: document.getElementById('search-input'),
    searchClearBtn: document.getElementById('search-clear-btn'),
    shelfMeta: document.getElementById('shelf-meta'),

    // Shelf & Empty State
    bookList: document.getElementById('book-list'),
    emptyState: document.getElementById('empty-state'),
    emptyTitle: document.getElementById('empty-title'),
    emptyMessage: document.getElementById('empty-message'),
    emptyIconWrapper: document.getElementById('empty-icon-wrapper'),

    // Statistics Counters
    statTotal: document.getElementById('stat-total'),
    statToRead: document.getElementById('stat-to-read'),
    statReading: document.getElementById('stat-reading'),
    statFinished: document.getElementById('stat-finished'),

    // Delete Modal
    deleteModal: document.getElementById('delete-modal'),
    modalBookTitle: document.getElementById('modal-book-title'),
    modalCancelBtn: document.getElementById('modal-cancel-btn'),
    modalConfirmBtn: document.getElementById('modal-confirm-btn'),

    // Toast
    toast: document.getElementById('toast'),
  };

  // -------------------------------------------------------------------------
  // Storage Management (Fault-Tolerant)
  // -------------------------------------------------------------------------

  /**
   * Validates if an object conforms to the expected Book interface.
   * @param {any} item
   * @returns {boolean}
   */
  function isValidBook(item) {
    return (
      item &&
      typeof item === 'object' &&
      typeof item.id === 'string' &&
      typeof item.title === 'string' &&
      typeof item.author === 'string' &&
      VALID_STATUSES.includes(item.status) &&
      typeof item.createdAt === 'number'
    );
  }

  /**
   * Safely loads books from browser localStorage.
   * Handles corrupted JSON without crashing.
   * @returns {Array<Object>}
   */
  function loadBooksFromStorage() {
    try {
      const serialized = localStorage.getItem(STORAGE_KEY);
      if (!serialized) {
        return [];
      }
      const parsed = JSON.parse(serialized);
      if (!Array.isArray(parsed)) {
        console.warn('Storage format invalid (not an array). Initializing empty bookshelf.');
        return [];
      }
      return parsed.filter(isValidBook);
    } catch (err) {
      console.error('Error reading books from localStorage:', err);
      showToast('Notice: Book shelf data could not be parsed. Resetting local list.');
      return [];
    }
  }

  /**
   * Safely persists the current books array to localStorage.
   * @param {Array<Object>} bookList
   */
  function saveBooksToStorage(bookList) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bookList));
    } catch (err) {
      console.error('Error saving books to localStorage:', err);
      showToast('Warning: Unable to save changes to localStorage (Storage quota exceeded or disabled).');
    }
  }

  /**
   * Generates a unique book ID.
   * @returns {string}
   */
  function generateId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'book_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  }

  // -------------------------------------------------------------------------
  // UI Helpers & Feedback
  // -------------------------------------------------------------------------

  let toastTimer = null;
  /**
   * Displays a temporary notification toast.
   * @param {string} message
   */
  function showToast(message) {
    if (!elements.toast) return;
    elements.toast.textContent = message;
    elements.toast.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      elements.toast.hidden = true;
    }, 3200);
  }

  /**
   * Formats a timestamp into a clean, human-readable date.
   * @param {number} timestamp
   * @returns {string}
   */
  function formatDate(timestamp) {
    try {
      const date = new Date(timestamp);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }).format(date);
    } catch {
      return 'Recently added';
    }
  }

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------

  /**
   * Validates title and author fields and displays inline messages.
   * @returns {boolean} True if both title and author are non-empty.
   */
  function validateForm() {
    let isValid = true;
    const titleVal = elements.titleInput.value.trim();
    const authorVal = elements.authorInput.value.trim();

    // Validate Title
    if (titleVal === '') {
      elements.titleError.textContent = 'Please enter a title';
      elements.titleInput.classList.add('has-error');
      elements.titleInput.setAttribute('aria-invalid', 'true');
      isValid = false;
    } else {
      clearTitleError();
    }

    // Validate Author
    if (authorVal === '') {
      elements.authorError.textContent = 'Please enter an author';
      elements.authorInput.classList.add('has-error');
      elements.authorInput.setAttribute('aria-invalid', 'true');
      isValid = false;
    } else {
      clearAuthorError();
    }

    return isValid;
  }

  function clearTitleError() {
    elements.titleError.textContent = '';
    elements.titleInput.classList.remove('has-error');
    elements.titleInput.removeAttribute('aria-invalid');
  }

  function clearAuthorError() {
    elements.authorError.textContent = '';
    elements.authorInput.classList.remove('has-error');
    elements.authorInput.removeAttribute('aria-invalid');
  }

  // -------------------------------------------------------------------------
  // Statistics Calculations
  // -------------------------------------------------------------------------

  /**
   * Recalculates statistics from the complete books collection
   * and updates the metric cards in the UI.
   */
  function updateStatistics() {
    const total = books.length;
    let toRead = 0;
    let reading = 0;
    let finished = 0;

    for (let i = 0; i < books.length; i++) {
      const status = books[i].status;
      if (status === 'To read') toRead++;
      else if (status === 'Reading') reading++;
      else if (status === 'Finished') finished++;
    }

    elements.statTotal.textContent = total.toString();
    elements.statToRead.textContent = toRead.toString();
    elements.statReading.textContent = reading.toString();
    elements.statFinished.textContent = finished.toString();
  }

  // -------------------------------------------------------------------------
  // Rendering & DOM Creation (Safe XSS-Immune Elements)
  // -------------------------------------------------------------------------

  /**
   * Creates a book card DOM element safely using document.createElement
   * and textContent to prevent any XSS vulnerabilities.
   * @param {Object} book
   * @returns {HTMLElement}
   */
  function createBookCardElement(book) {
    const card = document.createElement('article');
    card.className = 'book-card';
    card.setAttribute('role', 'listitem');
    card.setAttribute('data-id', book.id);

    // Card Header (Badge & Date)
    const header = document.createElement('div');
    header.className = 'book-header';

    const badgeRow = document.createElement('div');
    badgeRow.className = 'book-badge-row';

    const statusBadge = document.createElement('span');
    statusBadge.className = 'status-badge';
    statusBadge.setAttribute('data-status', book.status);
    statusBadge.textContent = book.status;

    const dateSpan = document.createElement('span');
    dateSpan.className = 'book-date';
    dateSpan.textContent = formatDate(book.createdAt);

    badgeRow.appendChild(statusBadge);
    badgeRow.appendChild(dateSpan);
    header.appendChild(badgeRow);

    // Book Title (Safe textContent)
    const titleEl = document.createElement('h3');
    titleEl.className = 'book-title';
    titleEl.textContent = book.title;
    header.appendChild(titleEl);

    // Book Author (Safe textContent)
    const authorEl = document.createElement('p');
    authorEl.className = 'book-author';

    const authorIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    authorIcon.setAttribute('class', 'book-author-icon');
    authorIcon.setAttribute('viewBox', '0 0 24 24');
    authorIcon.setAttribute('fill', 'none');
    authorIcon.setAttribute('stroke', 'currentColor');
    authorIcon.setAttribute('stroke-width', '2');
    authorIcon.setAttribute('stroke-linecap', 'round');
    authorIcon.setAttribute('stroke-linejoin', 'round');
    authorIcon.setAttribute('aria-hidden', 'true');

    const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path1.setAttribute('d', 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2');
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '12');
    circle.setAttribute('cy', '7');
    circle.setAttribute('r', '4');

    authorIcon.appendChild(path1);
    authorIcon.appendChild(circle);

    const authorText = document.createElement('span');
    authorText.textContent = book.author;

    authorEl.appendChild(authorIcon);
    authorEl.appendChild(authorText);
    header.appendChild(authorEl);

    card.appendChild(header);

    // Card Footer (Status Select Dropdown & Delete Button)
    const footer = document.createElement('div');
    footer.className = 'book-footer';

    // Status Select Group
    const selectGroup = document.createElement('div');
    selectGroup.className = 'status-select-group';

    const selectLabel = document.createElement('label');
    selectLabel.className = 'status-select-label';
    selectLabel.htmlFor = `status-select-${book.id}`;
    selectLabel.textContent = 'Status:';

    const select = document.createElement('select');
    select.id = `status-select-${book.id}`;
    select.className = 'card-status-select';
    select.setAttribute('aria-label', `Change status for ${book.title}`);

    VALID_STATUSES.forEach((statusOption) => {
      const opt = document.createElement('option');
      opt.value = statusOption;
      opt.textContent = statusOption;
      if (statusOption === book.status) {
        opt.selected = true;
      }
      select.appendChild(opt);
    });

    // In-place Status Change Listener
    select.addEventListener('change', (e) => {
      handleStatusChange(book.id, e.target.value, statusBadge);
    });

    selectGroup.appendChild(selectLabel);
    selectGroup.appendChild(select);
    footer.appendChild(selectGroup);

    // Delete Button
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'card-delete-btn';
    deleteBtn.setAttribute('aria-label', `Delete ${book.title}`);
    deleteBtn.title = `Delete ${book.title}`;

    const trashSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    trashSvg.setAttribute('viewBox', '0 0 24 24');
    trashSvg.setAttribute('fill', 'none');
    trashSvg.setAttribute('stroke', 'currentColor');
    trashSvg.setAttribute('stroke-width', '2');
    trashSvg.setAttribute('stroke-linecap', 'round');
    trashSvg.setAttribute('stroke-linejoin', 'round');
    trashSvg.setAttribute('aria-hidden', 'true');

    const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    polyline.setAttribute('points', '3 6 5 6 21 6');
    const pathBox = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathBox.setAttribute('d', 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2');
    const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line1.setAttribute('x1', '10');
    line1.setAttribute('y1', '11');
    line1.setAttribute('x2', '10');
    line1.setAttribute('y2', '17');
    const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line2.setAttribute('x1', '14');
    line2.setAttribute('y1', '11');
    line2.setAttribute('x2', '14');
    line2.setAttribute('y2', '17');

    trashSvg.appendChild(polyline);
    trashSvg.appendChild(pathBox);
    trashSvg.appendChild(line1);
    trashSvg.appendChild(line2);
    deleteBtn.appendChild(trashSvg);

    // Delete Button Listener
    deleteBtn.addEventListener('click', () => {
      openDeleteConfirmation(book.id);
    });

    footer.appendChild(deleteBtn);
    card.appendChild(footer);

    return card;
  }

  /**
   * Renders the bookshelf grid based on current search filter.
   * Guarantees newest books first ordering.
   * Empty state is displayed ONLY when books collection actually contains zero books.
   */
  function renderShelf() {
    const rawQuery = elements.searchInput.value;
    const query = rawQuery.trim().toLowerCase();

    // Toggle search clear button
    elements.searchClearBtn.hidden = (rawQuery.length === 0);

    // Guarantee reliable newest-first order
    const sortedBooks = [...books].sort((a, b) => b.createdAt - a.createdAt);

    // Clear existing cards
    elements.bookList.innerHTML = '';

    // Handle Empty Library State (ONLY when actual collection contains zero books)
    if (books.length === 0) {
      elements.bookList.hidden = true;
      elements.emptyState.hidden = false;
      elements.emptyTitle.textContent = 'Your bookshelf is empty';
      elements.emptyMessage.textContent = 'Start by adding your first book using the form on the left.';
      renderEmptyStateIcon('empty-library');
      elements.shelfMeta.textContent = '0 books';
      return;
    }

    // When books exist, the empty-state container is strictly hidden
    elements.emptyState.hidden = true;
    elements.bookList.hidden = false;

    // Filter by case-insensitive title or author
    const filtered = query === ''
      ? sortedBooks
      : sortedBooks.filter((b) =>
          b.title.toLowerCase().includes(query) ||
          b.author.toLowerCase().includes(query)
        );

    // If search filter matches 0 books, show search notice inside the list container (not the main empty-state)
    if (filtered.length === 0) {
      const notice = document.createElement('div');
      notice.className = 'no-results-notice';

      const iconWrapper = document.createElement('div');
      iconWrapper.className = 'empty-icon-wrapper';
      iconWrapper.setAttribute('aria-hidden', 'true');

      const searchSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      searchSvg.setAttribute('viewBox', '0 0 24 24');
      searchSvg.setAttribute('fill', 'none');
      searchSvg.setAttribute('stroke', 'currentColor');
      searchSvg.setAttribute('stroke-width', '2');
      searchSvg.setAttribute('stroke-linecap', 'round');
      searchSvg.setAttribute('stroke-linejoin', 'round');

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', '11');
      circle.setAttribute('cy', '11');
      circle.setAttribute('r', '8');
      const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line1.setAttribute('x1', '21');
      line1.setAttribute('y1', '21');
      line1.setAttribute('x2', '16.65');
      line1.setAttribute('y2', '16.65');

      searchSvg.appendChild(circle);
      searchSvg.appendChild(line1);
      iconWrapper.appendChild(searchSvg);

      const title = document.createElement('h3');
      title.className = 'empty-title';
      title.textContent = 'No matching books found';

      const msg = document.createElement('p');
      msg.className = 'empty-message';
      msg.textContent = `No books match "${elements.searchInput.value.trim()}". Try searching for a different title or author.`;

      notice.appendChild(iconWrapper);
      notice.appendChild(title);
      notice.appendChild(msg);
      elements.bookList.appendChild(notice);

      elements.shelfMeta.textContent = `0 of ${books.length} books match`;
      return;
    }

    // Update metadata summary
    if (query === '') {
      elements.shelfMeta.textContent = `Showing all ${books.length} book${books.length === 1 ? '' : 's'}`;
    } else {
      elements.shelfMeta.textContent = `Showing ${filtered.length} of ${books.length} book${books.length === 1 ? '' : 's'}`;
    }

    // Append book cards
    const fragment = document.createDocumentFragment();
    filtered.forEach((book) => {
      fragment.appendChild(createBookCardElement(book));
    });
    elements.bookList.appendChild(fragment);
  }

  /**
   * Renders the empty state icon for empty library.
   * @param {string} type
   */
  function renderEmptyStateIcon(type) {
    if (!elements.emptyIconWrapper) return;
    elements.emptyIconWrapper.innerHTML = '';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');

    const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path1.setAttribute('d', 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20');
    const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path2.setAttribute('d', 'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z');
    svg.appendChild(path1);
    svg.appendChild(path2);

    elements.emptyIconWrapper.appendChild(svg);
  }

  // -------------------------------------------------------------------------
  // Book Operations
  // -------------------------------------------------------------------------

  /**
   * Adds a new book to the shelf.
   * @param {Event} e
   */
  function handleAddBook(e) {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const title = elements.titleInput.value.trim();
    const author = elements.authorInput.value.trim();
    const status = elements.statusSelect.value;

    const newBook = {
      id: generateId(),
      title: title,
      author: author,
      status: VALID_STATUSES.includes(status) ? status : 'To read',
      createdAt: Date.now(),
    };

    // Prepend to array (newest first)
    books.unshift(newBook);
    saveBooksToStorage(books);

    // Reset Form and clear any active search filter so new book is immediately visible
    elements.form.reset();
    elements.statusSelect.value = 'To read';
    elements.searchInput.value = '';
    elements.searchClearBtn.hidden = true;
    clearTitleError();
    clearAuthorError();

    // Update UI immediately
    updateStatistics();
    renderShelf();

    showToast(`"${newBook.title}" added to shelf.`);
    elements.titleInput.focus();
  }

  /**
   * Updates a book's status in-place.
   * @param {string} bookId
   * @param {string} newStatus
   * @param {HTMLElement} statusBadge
   */
  function handleStatusChange(bookId, newStatus, statusBadge) {
    if (!VALID_STATUSES.includes(newStatus)) return;

    const bookIndex = books.findIndex((b) => b.id === bookId);
    if (bookIndex === -1) return;

    // Update memory & storage
    books[bookIndex].status = newStatus;
    saveBooksToStorage(books);

    // Update card status badge immediately
    if (statusBadge) {
      statusBadge.setAttribute('data-status', newStatus);
      statusBadge.textContent = newStatus;
    }

    // Refresh statistics counters immediately
    updateStatistics();
    showToast(`Status updated to "${newStatus}".`);
  }

  // -------------------------------------------------------------------------
  // Delete Confirmation Flow
  // -------------------------------------------------------------------------

  let lastActiveElement = null;

  /**
   * Opens the accessible delete confirmation dialog.
   * @param {string} bookId
   */
  function openDeleteConfirmation(bookId) {
    const book = books.find((b) => b.id === bookId);
    if (!book) return;

    pendingDeleteBookId = bookId;
    elements.modalBookTitle.textContent = `"${book.title}"`;
    lastActiveElement = document.activeElement;

    elements.deleteModal.hidden = false;
    elements.modalCancelBtn.focus();

    // Trap focus inside modal
    document.addEventListener('keydown', handleModalKeyDown);
  }

  /**
   * Closes the delete confirmation dialog.
   */
  function closeDeleteConfirmation() {
    pendingDeleteBookId = null;
    elements.deleteModal.hidden = true;
    document.removeEventListener('keydown', handleModalKeyDown);

    if (lastActiveElement && typeof lastActiveElement.focus === 'function') {
      lastActiveElement.focus();
    }
  }

  /**
   * Confirms and deletes the pending book.
   */
  function confirmDeleteBook() {
    if (!pendingDeleteBookId) return;

    const bookIndex = books.findIndex((b) => b.id === pendingDeleteBookId);
    if (bookIndex !== -1) {
      const deletedTitle = books[bookIndex].title;
      books.splice(bookIndex, 1);
      saveBooksToStorage(books);
      updateStatistics();
      renderShelf();
      showToast(`"${deletedTitle}" removed from shelf.`);
    }

    closeDeleteConfirmation();
  }

  /**
   * Handles keyboard navigation within the delete modal (Escape & Tab trap).
   * @param {KeyboardEvent} e
   */
  function handleModalKeyDown(e) {
    if (elements.deleteModal.hidden) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      closeDeleteConfirmation();
      return;
    }

    if (e.key === 'Tab') {
      const focusable = [elements.modalCancelBtn, elements.modalConfirmBtn];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Event Bindings & Initializer
  // -------------------------------------------------------------------------

  function setupEventListeners() {
    // Form submission
    elements.form.addEventListener('submit', handleAddBook);

    // Live validation clearing on input
    elements.titleInput.addEventListener('input', () => {
      if (elements.titleInput.value.trim() !== '') {
        clearTitleError();
      }
    });

    elements.authorInput.addEventListener('input', () => {
      if (elements.authorInput.value.trim() !== '') {
        clearAuthorError();
      }
    });

    // Search events
    elements.searchInput.addEventListener('input', () => {
      renderShelf();
    });

    elements.searchClearBtn.addEventListener('click', () => {
      elements.searchInput.value = '';
      elements.searchInput.focus();
      renderShelf();
    });

    // Delete modal events
    elements.modalCancelBtn.addEventListener('click', closeDeleteConfirmation);
    elements.modalConfirmBtn.addEventListener('click', confirmDeleteBook);

    // Close modal on clicking outside the modal card
    elements.deleteModal.addEventListener('click', (e) => {
      if (e.target === elements.deleteModal) {
        closeDeleteConfirmation();
      }
    });

    // Listen for storage changes from other tabs or windows in the background
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY) {
        books = loadBooksFromStorage();
        updateStatistics();
        renderShelf();
      }
    });
  }

  let isInitialized = false;

  function init() {
    if (isInitialized) return;
    isInitialized = true;

    setupEventListeners();
    books = loadBooksFromStorage();
    updateStatistics();
    renderShelf();
  }

  // Initialize application once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
