# Mock-to-Postgres Migration Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Purge legacy mock data artifacts and stale configuration to finalize the PostgreSQL migration.

**Architecture:** This is a cleanup task involving file deletions, documentation updates, and configuration purging. It ensures the codebase matches the modern PostgreSQL-only architecture.

**Tech Stack:** Node.js, Express, Jest, Git.

---

### Task 1: Delete Legacy Mock Files and Tests

**Files:**
- Delete: `server/src/mock/accounts.js`
- Delete: `server/src/mock/toggleState.js`
- Delete: `server/src/mock/users.js`
- Delete: `server/tests/mock/users.test.js`

- [ ] **Step 1: Remove the files**

Run:
```bash
rm server/src/mock/accounts.js server/src/mock/toggleState.js server/src/mock/users.js server/tests/mock/users.test.js
rmdir server/src/mock server/tests/mock
```

- [ ] **Step 2: Verify tests still pass**

Run: `cd server && npm test`
Expected: 129 tests passed (down from 130).

- [ ] **Step 3: Commit**

```bash
git add server/src/mock server/tests/mock
git commit -m "chore: delete legacy mock files and tests"
```

---

### Task 2: Purge Mock Configuration from .env.example

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Remove VITE_USE_MOCK from .env.example**

Remove the line `VITE_USE_MOCK=true` from `.env.example`.

- [ ] **Step 2: Verify file content**

Run: `grep "VITE_USE_MOCK" .env.example`
Expected: No matches found.

- [ ] **Step 3: Commit**

```bash
git add .env.example
git commit -m "chore: remove VITE_USE_MOCK from .env.example"
```

---

### Task 3: Update README.md Documentation

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Remove VITE_USE_MOCK references from README.md**

Delete mentions of `VITE_USE_MOCK` and the paragraph explaining mock data fallbacks.

- [ ] **Step 2: Verify file content**

Run: `grep "VITE_USE_MOCK" README.md`
Expected: No matches found.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: remove mock-related instructions from README"
```

---

### Task 4: Clean up db.js Comments

**Files:**
- Modify: `server/src/config/db.js`

- [ ] **Step 1: Update testConnection JSDoc**

Change:
```javascript
/**
 * Test the database connection. Call this at server startup,
 * not on module import, so the app can still run without
 * a database (e.g., when using the mock data layer in tests).
 */
```
To:
```javascript
/**
 * Test the database connection. Call this at server startup
 * to verify PostgreSQL availability.
 */
```

- [ ] **Step 2: Verify changes**

Run: `grep -C 2 "Test the database connection" server/src/config/db.js`
Expected: Updated comment without mock reference.

- [ ] **Step 3: Commit**

```bash
git add server/src/config/db.js
git commit -m "docs: remove mock reference from db.js"
```

---

### Task 5: Final Validation

- [ ] **Step 1: Comprehensive search for "mock"**

Run: `grep -ri "mock" server/src server/tests`
Expected: Only relevant comments (e.g., "mocking" in tests) or log messages, no functional "archived" mock code.

- [ ] **Step 2: Final test and lint**

Run: `cd server && npm test && npm run lint`
Expected: PASS and no lint errors.
