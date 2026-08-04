Implement the "Add Concepts + Live User Progress" feature.

Goal:
Allow students to add concepts to their study plan and ensure StudyHeader always displays accurate, up-to-date progress.

Requirements:

1. Add Concept UI
- Add an "Add Concept" button to ConceptBrowser.
- Open a modal/dialog when clicked.
- Allow the user to search/select available concepts.
- Prevent duplicate concepts from being added.
- Use the existing addConceptToPlan function from client.ts.
- If the user has no study plan, handle plan creation safely instead of creating duplicate plans.

2. StudyHeader Progress
Display:
- Mastery percentage
- Total concept count
- Completed/mastered concept count where available

Keep the existing StudyHeader design and make the new information responsive on mobile.

3. Reactive Updates
This is critical.

After successfully adding a concept:
- Update the concept list immediately.
- Update concept count immediately.
- Refresh/recalculate mastery statistics when necessary.
- Update StudyHeader without requiring a full page reload.
- Keep all UI state consistent with the backend.

If the existing data-fetching architecture has a cache/query invalidation mechanism, use it rather than creating a second state-management system.

4. Data Source
Reuse the existing DashboardView mastery calculations and existing learning client/services where appropriate.

Do NOT duplicate mastery calculation logic if it already exists.

5. Error Handling
- Show a clear loading state while adding.
- Prevent double submission.
- Show a useful error if adding fails.
- Do not leave the UI in an optimistic state if the backend operation fails.

6. Preserve Existing Functionality
Do not redesign Study.
Do not modify unrelated routes/components.
Do not create duplicate API endpoints.
Do not bypass authentication or RLS.
Reuse existing components, services, types, and UI patterns wherever possible.

7. Validation
Before finishing:
- Run npm run build
- Run npx tsc --noEmit
- Run npm run lint

Then test:
1. Open Study.
2. Add a concept.
3. Confirm it appears in the concept list.
4. Confirm concept count updates.
5. Confirm StudyHeader updates without page reload.
6. Confirm mastery/progress remains accurate.
7. Refresh the page and confirm backend state matches the UI.
8. Try adding the same concept twice and confirm duplicates are prevented.
9. Test the empty/no-study-plan case.
10. Test mobile layout.

Important:
Before modifying files, inspect the existing data flow between ConceptBrowser, DashboardView, StudyHeader, client.ts, and the study-plan data source.

Prefer the smallest clean implementation that fits the existing architecture.
At the end, report exactly which files changed, what changed, and the verification results.