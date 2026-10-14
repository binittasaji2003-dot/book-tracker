# Engineering Prompt Log & Development Incident Report

This document records the five core engineering prompts utilized to plan, structure, implement, refine, and verify the **My Book Shelf** Book Tracker web application, along with documentation of an authentic AI development incident encountered, diagnosed, tested, and resolved during this build.

---

## 1. Five Core Engineering Prompts

### Prompt 1: Architecture & System Design
```text
Act as a Principal Frontend Engineer. Design the complete architecture for a client-side Book Tracker ("My Book Shelf") web application using plain HTML5, CSS3, and modern vanilla JavaScript with localStorage persistence. 

Provide:
1. A semantic HTML5 hierarchy and component tree.
2. A refined design system with a soft cream background (#FAF7F2), navy-blue typography (#111E38), subtle blue accents (#2563EB), and status badge color schemes.
3. A resilient client-side state schema ensuring zero reliance on backend servers.
4. Comprehensive accessibility (WCAG 2.1 AA) including keyboard focus indicators, ARIA live regions, and semantic form associations.
5. Strict constraints preventing third-party runtime frameworks or build tools.
```

### Prompt 2: Semantic Form & Responsive Card Component Construction
```text
Create the semantic HTML5 structure and CSS styling for the Book Tracker dashboard. 

Requirements:
1. Header with title "My Book Shelf", subtitle, and SVG branding icon.
2. Reading stats counter grid displaying Total Books, To read, Reading, and Finished metrics with aria-live updates.
3. Add Book form with:
   - Title input with dedicated inline validation message container directly underneath.
   - Author input with dedicated inline validation message container directly underneath.
   - Reading status select with exactly "To read", "Reading", and "Finished".
   - "Add to Shelf" primary action button.
4. Responsive layout using CSS Grid and Flexbox: desktop two-column layout (sticky form sidebar + book grid) collapsing into a single-column layout on mobile viewports down to 320px.
5. Accessible delete confirmation modal dialog with backdrop overlay.
```

### Prompt 3: Resilient LocalStorage Persistence & Fault Tolerance
```text
Implement the localStorage persistence and data-handling layer in vanilla JavaScript (ES6+).

Requirements:
1. Define a robust schema for Book objects: { id, title, author, status, createdAt }.
2. Guarantee reliable reverse-chronological ordering (newest books first) using createdAt timestamps.
3. Wrap all localStorage reads and writes in try/catch blocks to gracefully handle:
   - Malformed or corrupted JSON strings.
   - Private browsing restrictions or disabled storage.
   - Storage quota exhaustion errors (QuotaExceededError).
4. Implement input sanitization and XSS prevention: enforce DOM text node creation (document.createElement and textContent) so user-provided titles/authors cannot execute arbitrary HTML/JavaScript.
```

### Prompt 4: Real-Time Search & In-Place Status Mutation
```text
Implement interactive book filtering and in-place status management in app.js.

Requirements:
1. Live search that filters book cards as the user types (input event).
   - Case-insensitive search matching either book title or author.
   - Ignore leading and trailing whitespace.
   - Maintain the original dataset without mutating the saved books array in localStorage.
   - Provide a clear button to quickly reset search input and restore all books.
2. Contextual empty states:
   - When the library has 0 books: show a welcoming empty shelf message.
   - When a search query matches 0 books: show a helpful message reflecting the search term.
3. In-place status update dropdown on each book card:
   - Instantly update card badge styling and text upon status change.
   - Immediately update localStorage and recalculate reading statistics counters.
4. Delete button with accessible confirmation modal before removal.
```

### Prompt 5: Automated Verification & Cross-Browser Edge Case Testing
```text
Develop a comprehensive automated test suite to rigorously test all functional and edge-case requirements for the Book Tracker web app.

Verify:
1. Form validation: empty title, empty author, and whitespace-only submissions block creation and display exact inline errors ("Please enter a title", "Please enter an author").
2. Real-time validation error clearing as the user types.
3. Multi-book additions with all three valid statuses.
4. Reverse-chronological sorting (newest book at the top).
5. Case-insensitive search (e.g. searching "BEN" when author is "Benyamin") and whitespace handling.
6. In-place status updates correctly altering metrics and storage without losing state.
7. Deletion flow: confirmation dialog cancellation vs confirmation.
8. Safe rendering of malicious script tags and HTML injection (<script>, <img onerror>).
9. App resilience when localStorage contains corrupted JSON.
```

---

## 2. Authentic AI Development Incident & Resolution

### Incident Summary
During automated testing of the DOM lifecycle and script execution, an idempotency flaw was identified in the application initialization sequence within `app.js`.

### The Defect
The initial code for bootstrapping `app.js` checked the document's readiness state as follows:

```javascript
// Initial flawed implementation:
function init() {
  setupEventListeners();
  books = loadBooksFromStorage();
  updateStatistics();
  renderShelf();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
```

When evaluated in environments where scripts are loaded dynamically, deferred, or tested across asynchronous DOM event triggers, `DOMContentLoaded` could fire or be dispatched after or during an initial invocation. Because `init()` lacked an execution guard, `setupEventListeners()` ran a second time. 

This resulted in duplicate event listener registrations on:
- `#add-book-form` (`submit` event)
- `#modal-confirm-btn` (`click` event)
- `#modal-cancel-btn` (`click` event)

If triggered in this state, submitting the form once would execute `handleAddBook` multiple times, adding duplicate book records for a single user click.

### How It Was Identified & Tested
1. **Identification:** During test suite development, our JSDOM automated test runner dispatched `DOMContentLoaded` to verify lifecycle handling. Multiple listener firings and repeated error logs in the test trace revealed that `init()` had executed twice.
2. **Reproduction Test:** We created an automated test case (`TEST SUITE 11: Initialization Idempotency & Duplicate Prevention`) that explicitly dispatched multiple `DOMContentLoaded` events in sequence and then performed a single form submission. Prior to the fix, the form submission added redundant entries to `localStorage`.

### The Solution
An idempotency guard flag (`isInitialized`) was implemented to ensure `init()` can only execute once during the lifetime of the document:

```javascript
// Corrected robust implementation:
let isInitialized = false;

function init() {
  if (isInitialized) return;
  isInitialized = true;

  setupEventListeners();
  books = loadBooksFromStorage();
  updateStatistics();
  renderShelf();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
```

### Verification & Outcome
Running the automated test suite confirmed:
- `TEST SUITE 11` passed: Submitting the form once after multiple `DOMContentLoaded` dispatches resulted in exactly one book being created and persisted.
- All 71 assertions across 11 test suites passed with 0 failures.

