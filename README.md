# My Book Shelf — Personal Reading Tracker

A clean, responsive, and functional **Book Tracker** web application designed to help readers organize their personal library, monitor reading progress, and stay motivated. Built entirely with vanilla web standards—plain HTML5, CSS3, and JavaScript—without any external libraries, frameworks, or backend dependencies.

---

## Table of Contents

1. [Overview](#overview)
2. [Key Features](#key-features)
3. [Design & User Experience](#design--user-experience)
4. [Technologies Used](#technologies-used)
5. [How to Run Locally](#how-to-run-locally)
6. [How `localStorage` Works](#how-localstorage-works)
7. [Publishing with GitHub & GitHub Pages](#publishing-with-github--github-pages)
8. [Security & Accessibility](#security--accessibility)

---

## Overview

**My Book Shelf** provides an intuitive interface for managing your reading goals. You can track books across three core states—*To read*, *Reading*, and *Finished*—filter through your collection as you type, and see your reading statistics update in real time. All data is saved automatically in your browser's local storage, ensuring your library persists across page reloads and browser sessions.

---

## Key Features

- **Add New Books:** Add books with a title, author, and reading status (*To read*, *Reading*, or *Finished*).
- **Inline Validation:** Instant, accessible validation messages displayed directly beneath the relevant input field if title or author is left blank. Errors clear automatically as you start typing.
- **Newest-First Ordering:** Books are sorted in reverse chronological order based on exact creation timestamps so your latest additions appear at the top.
- **Instant Live Search:** Real-time search across both titles and authors. The search is case-insensitive, ignores leading and trailing spaces, and includes a quick one-click clear button.
- **In-Place Status Updates:** Change the reading status of any book directly from its card via an integrated dropdown. Changes immediately update the status badge, database, and reading statistics.
- **Safe Deletion Flow:** Deleting a book triggers an accessible confirmation modal dialog to prevent accidental removals, with full keyboard trap and Escape key support.
- **Live Reading Statistics:** Dynamic dashboard displaying total books and breakdown counters for *To read*, *Reading*, and *Finished*. Counters stay synchronized across additions, status updates, and deletions.
- **Contextual Empty States:** Clean visual empty states with helpful guidance when your bookshelf has no books or when a search returns zero matches.
- **Resilient Storage Handling:** Safe data reading and writing with graceful fallbacks if stored data is corrupted or if browser storage quotas are exceeded.
- **XSS Protection:** All user-provided book titles and authors are safely inserted via DOM text nodes (`textContent`), preventing HTML or script injection attacks.

---

## Design & User Experience

- **Color Palette:** Soft warm cream background (`#FAF7F2`), deep navy-blue typography (`#111E38`, `#2C3E5A`), and subtle blue accent highlights (`#2563EB`, `#EFF6FF`).
- **Status Badges:** Distinct, soft, high-contrast badges for each status:
  - *To read*: Warm amber (`#FEF3C7` / `#92400E`)
  - *Reading*: Subtle blue (`#DBEAFE` / `#1E40AF`)
  - *Finished*: Sage emerald (`#DCFCE7` / `#166534`)
- **Typography:** Refined editorial serif for titles (*Lora*, *Georgia*) paired with a crisp, modern sans-serif for UI elements (*Plus Jakarta Sans*, system font stack).
- **Responsive Layout:** Adaptive desktop two-column view (sticky input form + fluid book grid) that collapses into an ergonomic single-column view on mobile screens (down to 320px).
- **Accessibility:** Visible focus rings (`:focus-visible`), ARIA live regions for screen reader announcements, semantic landmarks, and skip-to-content links.

---

## Technologies Used

- **HTML5:** Semantic elements (`<header>`, `<main>`, `<aside>`, `<section>`, `<article>`, `<form>`, `<dialog>`).
- **CSS3:** Custom properties (CSS variables), CSS Grid, Flexbox, media queries, smooth animations, and `prefers-reduced-motion` compliance.
- **JavaScript (ES6+):** Pure vanilla JavaScript without external dependencies or build tools. Modules, DOM event listeners, and Web Storage API.

---

## How to Run Locally

Because the application is built entirely with client-side standards, no build step, compiler, or package manager is required.

### Method 1: Direct Browser Launch (Quickest)
1. Clone or download the project folder.
2. Locate `index.html` in your file explorer.
3. Double-click `index.html` or right-click and select **Open With** followed by your browser (e.g., Google Chrome, Microsoft Edge, Firefox, Safari).

### Method 2: Lightweight Python HTTP Server
If you prefer running through a local development server:
```bash
# Navigate to the project directory
cd /path/to/project

# For Python 3
python -m http.server 8000
```
Open your browser and navigate to `http://localhost:8000`.

### Method 3: Node.js `npx serve`
```bash
# Run a zero-config static server
npx serve .
```
Navigate to the local URL displayed in your terminal (typically `http://localhost:3000`).

---

## How `localStorage` Works

Browser `localStorage` is part of the Web Storage API. It allows web applications to store key-value pairs in a web browser with no expiration date.

### 1. Storage Mechanism
- Data persists across browser restarts, tab closures, and page reloads.
- Data is scoped to the **origin** (protocol + domain + port).
- The typical storage quota is approximately 5MB per origin.

### 2. Serialization with JSON
Since `localStorage` only stores UTF-16 strings, complex data structures (like arrays of objects) are converted using:
- **Serialization:** `JSON.stringify(books)` converts the JavaScript array into a string before calling `localStorage.setItem(key, value)`.
- **Deserialization:** `JSON.parse(serialized)` converts the stored string back into a JavaScript array via `localStorage.getItem(key)`.

### 3. Fault Tolerance & Safety in this App
In `app.js`, storage interactions are protected:
```javascript
function loadBooksFromStorage() {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) return [];
    const parsed = JSON.parse(serialized);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidBook);
  } catch (err) {
    console.error('Error reading books from localStorage:', err);
    return [];
  }
}
```
If localStorage contains malformed JSON or if the user browses in a locked private browsing mode, the app catches the exception gracefully without crashing or freezing.

---

## Publishing with GitHub & GitHub Pages

Follow these step-by-step instructions to publish this project online for free using GitHub Pages:

### Step 1: Initialize Git and Commit Files
Open your terminal in the project directory:
```bash
# Initialize a local Git repository
git init

# Stage all files
git add index.html style.css app.js README.md PROMPTS.md

# Commit your changes
git commit -m "Initial commit: Complete Book Tracker application"
```

### Step 2: Create a New GitHub Repository
1. Log in to your account at [GitHub.com](https://github.com).
2. In the top-right corner, click the **+** icon and select **New repository**.
3. Name your repository (e.g., `book-tracker` or `my-book-shelf`).
4. Set the visibility to **Public**.
5. Leave "Add a README file" **unchecked** (we already created one).
6. Click **Create repository**.

### Step 3: Link and Push to GitHub
Copy the commands shown on GitHub under **"push an existing repository from the command line"**:
```bash
# Rename default branch to main
git branch -M main

# Add your GitHub repository as remote origin (replace with your GitHub username)
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPOSITORY_NAME>.git

# Push code to GitHub
git push -u origin main
```

### Step 4: Enable GitHub Pages
1. On GitHub, navigate to your repository's page.
2. Click on the **Settings** tab near the top.
3. In the left navigation menu, click **Pages** (under the "Code and automation" section).
4. Under **Build and deployment**:
   - **Source**: Select `Deploy from a branch`.
   - **Branch**: Select `main` from the dropdown and leave the folder set to `/ (root)`.
5. Click **Save**.

### Step 5: Access Your Live Application
GitHub Pages will take 1–2 minutes to build and publish your site. Refresh the **Pages** settings screen until you see the banner:
> **Your site is live at `https://<YOUR_GITHUB_USERNAME>.github.io/<YOUR_REPOSITORY_NAME>/`**

Click the link to view your live, fully-functional Book Tracker application!

---

## Security & Accessibility

- **Zero Third-Party Dependencies:** Zero npm packages at runtime, zero CDN vulnerabilities, and no external tracking.
- **Cross-Site Scripting (XSS) Prevention:** User input is never injected with `innerHTML`. All titles and authors are inserted strictly via `document.createElement` and `node.textContent`.
- **Keyboard & Screen Reader Support:** Full tab navigation, logical heading hierarchy, explicit `<label>` bindings, aria live regions for dynamic counters, and an accessible confirmation modal.

