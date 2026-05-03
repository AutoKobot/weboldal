# Task Execution Log

This log tracks the major changes, fixes, and architectural decisions made by the AI Assistant.

## Current Session: 2026-05-01

### 4. SQL Ambiguity & IKK Import Stabilization
 
- **Problem**: PostgreSQL crashed with `column reference "id" is ambiguous` during IKK imports. Curriculum extraction was missing granular sub-topics.
- **Solution**: 
  - Refactored `storage.ts` to use explicit table qualifications and hardcoded prefixes.
  - Implemented "Middle Ground" IKK processing (concurrency 2, 2000-char overlap).
  - Added alphanumeric sub-numbering (`3.x.a`, `3.x.b`) and automated title cleaning on frontend.
- **Result**: Stable imports and detailed curricula.

### 1. Curriculum Sorting Fix

- **Problem**: Modules and subjects were appearing in arbitrary order.
- **Solution**: Implemented a natural numeric sorting algorithm based on `sectionCode` (e.g., 3.4.1.2) in both the backend (`storage.ts`) and frontend (`modules.tsx`, `tananyagok.tsx`, `ModuleManager.tsx`).
- **Result**: Curriculum now follows the official IKK/PTT educational sequence.

### 2. Theory/Practical Split

- **Problem**: Practical content was often mixed with theory or missing entirely.
- **Solution**: Modified IKK extraction prompts to force separate modules for theory and practice. Updated `ModuleViewer` to display `practicalTasks` specifically for practical modules.
- **Result**: Clear separation of learning types, matching the vocational training standard.

### 3. Student Progress (0%) Fix

- **Problem**: Students saw 0% progress even after completing modules.
- **Solution**:
  - Updated `/api/modules` to filter by `selectedProfessionId`.
  - Refined frontend progress math in `home.tsx` to only count modules relevant to the student's current profession.
- **Result**: Accurate progress tracking.

### 4. Developer Knowledge Base

- **Added**: `docs/developer/database-schema.md`, `component-catalog.md`, `api-endpoints.md`, `prompts.md`.
- **Tooling**: Created `scripts/data-integrity-check.ts` for database diagnostics.

### 5. Dashboard Stabilization & Fixes

- **Problem**: Admin dashboard crashed (white screen) on tab switching; professions disappeared or threw 500 errors.
- **Solution**:
  - **UI**: Implemented `ErrorBoundary` to isolate component failures.
  - **Runtime**: Fixed missing icon imports (`Calendar`).
  - **Database**: Added missing `icon_name` and `icon_url` columns to `professions` via `ensureSchemaUpToDate`.
  - **Data**: Refactored `getProfessions` with robust subqueries for statistics.
  - **Conflict**: Identified Google Translate as a major cause of DOM-related React crashes; added explicit warnings.
- **Result**: Stable dashboard with accurate statistics and graceful error handling.

## Current Session: 2026-05-03

### 6. Subject-Module Split & Automated Reorganization

- **Problem**: IKK import often grouped mixed theory and practical modules under a single subject, causing confusing UI categorization where practical modules would appear under "Theory" cards or vice-versa.
- **Solution**:
  - **Backend**: Implemented `reorganizeSubjects(professionId)` in `storage.ts`. This algorithm splits subjects containing both theory and practical modules into two distinct subject records, maintaining a clean 1:1 mapping between subject type and module content.
  - **Automation**: Hooked the reorganization algorithm into the end of the IKK import pipeline.
  - **Admin UI**: Updated `SubjectManager.tsx` to match the student view's "Theory" vs "Practice" card selection. Added a manual "Reorganize" (Wand) button to fix existing curricula.
  - **API**: Added `/api/ikk/reorganize/:id` endpoint for manual triggering.
- **Result**: Perfectly organized curricula where theory and practice are distinct at both the subject and module levels, preventing miscategorization and improving UX.

## Pending Tasks / Roadmap

- [ ] Clean up "Ghost Data" using the integrity script results.
- [ ] Implement AI-driven Question generation for Practical modules.
- [ ] Optimize IKK import performance (Parallel chunk processing).
- [ ] Fix CSS inline styles in `home.tsx` (as reported by IDE).
