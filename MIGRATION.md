# Pushpak Migration Notes

## Legacy Features Discovered

- XML import with `DOMParser`
- Auto-wrap fallback using `<ROOT>` when the input is not a single well-formed document
- Sentence discovery via `Sentence`, `Sent`, and `S`
- Token rendering via `W`
- Annotation editing for `NUMEX`, `ENAMEX`, and `TIMEX`
- Create annotation from selected words
- Delete annotation and preserve words as plain text
- Extend and shrink annotation boundaries
- Split annotations into two spans
- Merge adjacent annotations in the same sentence
- Split punctuation-attached tokens
- Validation for missing ID, missing TYPE, non-standard TYPE, empty annotations, nested annotations, duplicate IDs, and optional missing-number heuristics
- Sentence review status tracking
- Local autosave using `localStorage`
- Corrected XML export
- JSON correction log export

## Legacy Functions and New Equivalents

- `loadXMLString` → `parseXmlCorpus` + `usePushpakStore.loadXml`
- `render` / `renderContainer` → React sentence canvas and navigator
- `createAnnotationFromSelection` → `usePushpakStore.createAnnotation`
- `changeType` → `usePushpakStore.changeAnnotationType`
- `deleteAnnotation` → `usePushpakStore.deleteAnnotation`
- `splitAnnotation` → planned React workflow, not yet reintroduced
- `attemptMerge` → planned React workflow, not yet reintroduced
- `runValidation` → `src/lib/validation.ts`
- `exportXML` → `serializeProjectXml`
- `exportLog` → planned audit export UI, not yet reintroduced
- `autoSave` / `restoreSession` → planned IndexedDB persistence layer

## Preserved Behavior

- Legacy corpus assumptions were documented before the rewrite.
- The original HTML implementation was backed up unchanged at [legacy/index.original.html](legacy/index.original.html).
- The new parser still recognizes the discovered sentence wrappers and annotation tags.
- XML export is still available from the active UI.
- Token-level IOB2 export is now available as a new export path.

## Changed Behavior

- The active app is now React-based instead of imperative DOM mutation.
- The workspace is split into a modern three-panel shell.
- The app now uses typed domain objects for sentences, tokens, and annotations.
- Validation is structured around typed issues instead of ad hoc DOM messages.
- The command palette is scaffolded as a modal UI rather than a legacy prompt flow.

## Removed Behavior for Now

- Legacy prompt-driven merge and split flows are not yet reimplemented.
- Legacy autosave to `localStorage` is not yet wired into the React state store.
- Legacy per-sentence status cycling is not yet exposed in the new shell.
- Legacy inline boundary controls are not yet present.

## XML Compatibility Notes

- The current parser and serializer are validated on the legacy sample shape found in the original tool.
- Sentence and annotation attributes are preserved when parsed into the typed model.
- The original sentence XML snapshot is retained on the sentence model.
- Unknown wrapper preservation and full byte-for-byte round-trip parity are still open tasks.

## Remaining Work

- IndexedDB persistence and recovery snapshots
- Full undo/redo command stack with minimal patches
- Boundary drag handles and preview state machine
- Token splitting with grapheme-aware segmentation
- Annotation merging and splitting workflows
- Audit timeline and research export UI
- Urdu RTL and broader Indic font registry
- Worker-based validation and export pipelines
- End-to-end testing for the full workflow matrix

## Technical Decisions

- The root legacy HTML was backed up before replacement.
- The rewrite uses Vite because the app is a local offline-first browser tool.
- The first migration slice focuses on stable XML parsing and serializer compatibility before advanced workflows.
- The initial React shell intentionally favors clarity over feature-complete parity so the remaining milestones can be added safely.
