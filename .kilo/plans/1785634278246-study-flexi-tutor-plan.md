# Plan: `/study` Platform — CK-12 Flexi AI Tutor

## Goal

Transform `/study` from a placeholder into a CK-12 Flexi-style AI tutor platform, enhanced with LORD's cyberpunk HUD identity and innovative features beyond the reference.

## Current State

- **Route** `src/routes/_authenticated/study.tsx` is a 15-line placeholder ("Coming Soon"). No search validators.
- **StudyShell** (`src/components/learning/StudyShell.tsx`, 1450 lines) is fully built — 6 views (learn, practice, plan, feed, boards, progress), Socratic tutor, mastery map, adaptive quizzes, source ingestion. Uses Supabase-backed data via `getLearningSnapshot`.
- **Premium dashboard components** in `src/components/study/` are fully built but unused: `StudyLanding`, `HeroMission`, `QuickActionCards`, `RecentActivity`, `StudyInsights`, `SubjectAnalytics`, `WeakAreas`, `Achievements`, `InsightPanel`, `StudyCard`, `StudyWorkspaceShell`, `NotesWorkspace`, `RevisionWorkspace`, `FlashcardWorkspace` (with full `FlashcardDeckView` + FSRS-style spaced repetition), `MCQWorkspace` (with `MCQQuiz`/`MCQQuestionCard`/`MCQProgress`/`MCQResults`).
- **Local-first data layer** in `src/hooks/study/`: `useStudyDashboard`, `study-activity-store` (localStorage), `study-activity-types.ts` (7 achievement definitions).
- **API layer** in `src/lib/learning/`: `types.ts` (484 lines), `client.ts` (all CRUD), `mastery.ts` (algorithms). API routes at `src/routes/api/learning/` — session, features, flashcards, revision, voice, ocr, memory, notes, whiteboard, goals, analytics, sources/ingest.
- **Existing redirect routes**: `/learn`, `/practice`, `/plan`, `/feed`, `/boards`, `/progress` all redirect to `/study?view=<matching>`.
- **StudyShell** reads `view` via `useSearch({ from: "/_authenticated/study" })` but the route has no search schema — this will return undefined.

---

## Architecture Decisions

### D1: View Param Routing

The `/study` route becomes a single-page view-switcher via `?view=` search param. Default (no param) = landing/dashboard.

| View Param           | Component                                 | Data Source                        |
| -------------------- | ----------------------------------------- | ---------------------------------- |
| _(none)_ / `landing` | `StudyLanding`                            | `useStudyDashboard` (localStorage) |
| `learn`              | `StudyShell` (LearnView default)          | Supabase `getLearningSnapshot`     |
| `practice`           | `StudyShell` (PracticeView)               | Supabase                           |
| `plan`               | `RevisionWorkspace`                       | `streamChat` + `recordActivity`    |
| `feed`               | `StudyShell` (FeedView)                   | Supabase                           |
| `boards`             | `StudyShell` (BoardsView)                 | Supabase                           |
| `progress`           | `StudyShell` (ProgressView)               | Supabase                           |
| `notes`              | `NotesWorkspace`                          | `streamChat` + `recordActivity`    |
| `flashcards`         | `FlashcardWorkspace`                      | localStorage (FSRS)                |
| `test`               | `MCQWorkspace`                            | `streamChat` + `recordActivity`    |
| `tutor`              | `StudyShell` (LearnView, auto-open tutor) | Supabase + chat API                |
| `revision`           | `RevisionWorkspace`                       | `streamChat` + `recordActivity`    |

### D2: Data Bridge

- Premium workspaces (notes, flashcards, test, revision, plan) call `useStudyDashboard().recordActivity()` when actions complete, so the dashboard reflects activity across all views.
- `StudyShell` remains on the Supabase data path (full learning platform). No data duplication.
- `useCurrentUser()` provides `user.id` for both data sources.

### D3: Navigation

- `StudyLanding`'s `onNavigate(mode)` maps to `navigate({ to: "/study", search: { view: mappedView } })`.
- Mode mapping: `tutor` → `tutor`, `tasks` → `notes` (primary task generator), `test` → `test`.
- Quick action cards navigate to specific views.

---

## Implementation Steps

### Phase 1 — Route Foundation (critical, unblocks everything)

#### 1.1 Update `src/routes/_authenticated/study.tsx`

- Add `search` validator with Zod: `{ view: z.enum([...all views]).optional().default("landing") }`
- Replace placeholder body with a `StudyRouter` component that:
  - Reads `view` from validated search params
  - Uses `useCurrentUser()` to get `userId`
  - Calls `useStudyDashboard(userId)` to get `{ data, recordActivity, updateActivity }`
  - Switches on `view` to render the appropriate component
  - Passes `recordActivity` and navigation callbacks to premium workspaces
- Wrap in the app's auth layout (already handled by `_authenticated` parent route)

#### 1.2 Add search param validators to redirect routes

- `learn.tsx`, `practice.tsx`, `plan.tsx`, `feed.tsx`, `boards.tsx`, `progress.tsx` already redirect with `search: { view: "..." }` — no change needed since the target route will now validate search params.

### Phase 2 — Dashboard Integration

#### 2.1 Wire StudyLanding

- Mount `StudyLanding` with `data` from `useStudyDashboard(userId)`
- Implement `onNavigate(mode)` → `navigate({ to: "/study", search: { view } })`
- Implement `onContinueLearning` → `navigate({ to: "/study", search: { view: "learn" } })`

#### 2.2 Activity recording in premium workspaces

- **NotesWorkspace**: After generation completes, call `recordActivity({ type: "generated_notes", subject, title, durationMinutes })`
- **RevisionWorkspace**: After plan generated, call `recordActivity({ type: "started_revision", ... })`
- **MCQWorkspace**: On quiz completion, parse score, call `recordActivity({ type: "completed_quiz", score, totalQuestions, correctAnswers, ... })`
- **FlashcardWorkspace**: On deck creation, call `recordActivity({ type: "created_flashcards", ... })`

Each workspace already receives `recordActivity` via props from the route — no internal changes needed to the workspace components themselves, just wire the callbacks.

### Phase 3 — Data Bridge (Supabase ↔ Local)

#### 3.1 Export StudyShell activities to localStorage

- In StudyShell, when a tutor session completes or a quiz is taken in PracticeView, call a `recordActivity` callback (prop-threaded from the route) to log the event.
- This makes the dashboard reflect StudyShell usage too.

#### 3.2 Sync learning snapshot to dashboard insights

- The `SubjectAnalytics` and `WeakAreas` components on StudyLanding derive from local activities. For a richer signal, optionally augment with `data.mastery` from `getLearningSnapshot` when available.
- Decision: Keep StudyLanding deriving from local activities only for now (simpler, avoids coupling). Supabase can be added later as an enhancement.

### Phase 4 — Innovative Features Beyond Flexi

#### 4.1 Image Upload for Homework Help (NEW)

- Create `src/components/study/HomeworkHelpWorkspace.tsx`
- File upload + drag-drop zone — captures photo of a problem
- Sends image to `/api/learning/session` action `"ocr"` then `"question"` with extracted text
- AI solves step-by-step in Socratic mode
- Maps to view param `help`
- Reuses existing OCR pipeline (`/api/learning/ocr.ts`)

#### 4.2 AI Mnemonics Generator (NEW)

- Extend `FlashcardCard` type with `mnemonic?: string` (already has `memoryTip`)
- When generating flashcards, prompt AI to include a personalized mnemonic based on user interests (from learning profile `interests`)
- Add a "Generate Mnemonic" button on individual flashcards
- Maps to view param `mnemonics`

#### 4.3 Confidence-Based Testing (enhancement to MCQ)

- Add a confidence slider (1-5) before submitting each MCQ answer
- Track confidence vs correctness to compute calibration score
- Show calibration insights in the results view
- Requires modification to `MCQQuiz.tsx` and `MCQQuestionCard.tsx`

#### 4.4 Multi-Modal Tutor Mode Selector (enhancement to StudyShell)

- The `TutorMode` type already exists: `socratic | direct | hint | worked_example | simplified | analogy | diagnostic`
- Add a mode toggle dropdown in the TutorStudio UI of StudyShell
- Pass mode to `/api/learning/session` action `"tutor"` as `tutorMode` in the request body

#### 4.5 Knowledge Graph Expansion (enhancement to MasteryMap)

- MasteryMap already shows concepts with dependency arrows
- Add a "graph" view mode with zoom/pan, concept focus, and related-resource links
- Use existing D3 or SVG-based rendering (MasteryMap already uses SVG)

#### 4.6 Proactive Streak Nudges (NEW)

- Create a lightweight notification component that checks `useStudyDashboard` streak
- When streak > 0 and user hasn't studied today, show a "Keep your streak alive!" banner
- Uses LORD's notification system (check existing patterns in the app)

### Phase 5 — Polish & Validation

#### 5.1 Responsive layout

- Ensure `StudyRouter` renders full-width with proper padding/margins
- Mobile: stack views, collapsible nav

#### 5.2 Loading states

- Show skeleton loaders while `getLearningSnapshot` or `useStudyDashboard` loads

#### 5.3 Error boundaries

- Catch AI API errors (timeout, quota) and show retry UI

#### 5.4 Type-check & lint

- Run `npx tsc --noEmit` and `npm run lint` (or equivalent)

---

## Data Flow

```
User navigates to /study (or /study?view=learn)
  → _authenticated/study.tsx route validates search.params.view
    → StudyRouter reads view + userId
      → useStudyDashboard(userId) → local-first study data
      → Premium workspace components receive recordActivity callback
        → On action complete, recordActivity() writes to localStorage
        → useStudyDashboard re-derives (via subscription) → StudyLanding updates

When user navigates to ?view=learn:
  → StudyShell reads view via useSearch
    → useQuery(["learning", userId]) → getLearningSnapshot(userId) → Supabase
    → StudyShell internal views: learn/practice/plan/feed/boards/progress
    → TutorStudio calls /api/learning/session → /api/chat (streaming)

Premium workspaces use streamChat() → /api/chat (SSE streaming)
```

## Risks & Mitigations

| Risk                                                                                                 | Mitigation                                                                                      |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| StudyShell's `useSearch` returns undefined (route has no search schema)                              | Phase 1.1 adds Zod search validator with `.default("landing")`                                  |
| StudyShell imports `AI_GENERATED_NOTICE` from types — verify it exists                               | Read confirmed: types.ts:448 exports it                                                         |
| FlashcardWorkspace imports `FlashcardDeckView` from `./FlashcardDeck` — verify exists                | Read confirmed: exported at line 34                                                             |
| MCQWorkspace has `rawText` prop with no default — needs to receive AI-generated content              | Wire via streamChat: after API returns MCQ markdown, pass to MCQWorkspace                       |
| Two data systems (Supabase + localStorage) may diverge                                               | Accept divergence: StudyShell = persistent learning data; dashboard = session/activity tracking |
| `onNavigate` in StudyLanding uses modes `tutor`/`tasks`/`test` but route uses `tutor`/`notes`/`test` | Map `tasks` → `notes` in the navigation handler                                                 |
| Route component re-mounts on view change (losing state)                                              | Use `key={view}` pattern or state persistence; acceptable for MVP                               |

## Validation

1. `npx tsc --noEmit` — no type errors
2. `npm run lint` — no lint errors
3. Manual: Navigate between all views, verify dashboard updates with activity recording
4. Manual: AI tutor responds with streaming text
5. Manual: Flashcard FSRS scheduling works (rate cards, see next intervals)
6. Manual: MCQ quiz parses and scores correctly
7. Manual: Notes/Revision generation streams text via SSE

## Files to Create/Modify (summary)

**New files:**

- `src/components/study/HomeworkHelpWorkspace.tsx` (Phase 4.1)
- `src/components/study/StudyRouter.tsx` (or inline in route) (Phase 1)
- `src/components/study/ProactiveStreakNudge.tsx` (Phase 4.6)

**Modified files:**

- `src/routes/_authenticated/study.tsx` (Phase 1.1)
- `src/components/study/NotesWorkspace.tsx` (add recordActivity prop, Phase 2.2)
- `src/components/study/RevisionWorkspace.tsx` (add recordActivity prop, Phase 2.2)
- `src/components/study/MCQWorkspace.tsx` (add recordActivity prop, Phase 2.2)
- `src/components/study/FlashcardWorkspace.tsx` (add recordActivity prop, Phase 2.2)
- `src/components/study/mcq/MCQQuiz.tsx` (add confidence slider, Phase 4.3)
- `src/components/learning/StudyShell.tsx` (add tutor mode selector, Phase 4.4)
- `src/components/learning/MasteryMap.tsx` (add graph view, Phase 4.5)
- `src/lib/learning/types.ts` (add mnemonic fields, Phase 4.2)

## Open Questions

- Should StudyShell's internal views (learn/practice/plan/feed/boards/progress) also call `recordActivity` for dashboard consistency? (Recommended: yes for practice quiz completions and tutor sessions)
- Should we consolidate the two data systems into one? (Recommended: keep separate for MVP — Supabase for learning domain, localStorage for activity/dashboard; revisit if sync issues arise)
