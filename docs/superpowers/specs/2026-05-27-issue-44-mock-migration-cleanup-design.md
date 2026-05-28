# Design Spec - Mock-to-Postgres Migration Cleanup (Jira-54)

This specification outlines the steps to finalize the migration from in-memory mock data to PostgreSQL by purging legacy artifacts and stale configuration.

## 1. Problem Statement
The FauxVault application has successfully migrated its data layer to PostgreSQL. However, legacy mock files, redundant tests, and stale environment variables still exist in the repository. This creates technical debt, increases the repository size, and can confuse developers about the source of truth for data models.

## 2. Proposed Changes

### 2.1 File Deletions
Remove all "archived" mock files and their corresponding tests.

- `server/src/mock/accounts.js`
- `server/src/mock/toggleState.js`
- `server/src/mock/users.js`
- `server/tests/mock/users.test.js`

### 2.2 Configuration Updates
Remove references to the mock layer from configuration files.

- **`.env.example`**: Delete the line `VITE_USE_MOCK=true`.
- **`README.md`**: 
    - Remove the `VITE_USE_MOCK` variable from the environment variables table/list.
    - Remove the paragraph explaining how the frontend uses mock data by default.

### 2.3 Code Documentation Cleanup
- **`server/src/config/db.js`**: Update the JSDoc for `testConnection()` to remove the parenthetical remark about "using the mock data layer in tests."

## 3. Verification Plan

### 3.1 Automated Tests
- Run `npm test` in the `server/` directory. 
- **Success Criteria**: 129 tests passing (130 total minus the 1 deleted mock test).

### 3.2 Linting
- Run `npm run lint` in the project root and `server/` directory.
- **Success Criteria**: No errors or warnings related to missing files or broken imports.

### 3.3 Manual Inspection
- Verify that `grep -r "mock" server/src` no longer returns any functional code (only comments or logs are acceptable if they refer to the *past* use of mocks).
- Verify that the `server/src/mock/` directory is empty/removed.
