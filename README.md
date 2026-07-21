# Pushpak

Pushpak is a browser-based Named Entity correction tool for multilingual Indic XML corpora. This repository now contains a modern React + TypeScript + Vite scaffold, while the original monolithic HTML implementation is preserved in [legacy/index.original.html](legacy/index.original.html).

## Overview

The current app loads XML corpora, parses sentence and annotation structure into a normalized in-memory model, and provides a desktop-style workspace for navigation, annotation editing, validation, and export. The legacy XML document is still retained as the compatibility baseline, but the active UI is now a modular React application.

## Architecture

- React for the UI shell
- TypeScript for strict domain typing
- Vite for local development and production builds
- Zustand for application state
- `@tanstack/react-virtual` for the sentence navigator
- `zod` available for runtime validation hooks
- XML parsing and serialization in `src/lib/xml.ts`
- Validation in `src/lib/validation.ts`
- IOB2 export in `src/lib/export.ts`

## Repository Structure

```text
/home/govind/annotation_tool/
├── legacy/
│   └── index.original.html
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── styles.css
│   ├── lib/
│   │   ├── export.ts
│   │   ├── types.ts
│   │   ├── validation.ts
│   │   └── xml.ts
│   ├── stores/
│   │   └── usePushpakStore.ts
│   └── tests/
│       └── xml.test.ts
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── README.md
```

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Production Build

```bash
npm run build
```

## Deploy to GitHub Pages

1. Push the repository to GitHub.
2. In the repository settings, enable GitHub Pages from GitHub Actions.
3. On every push to `main` or `master`, the workflow in [.github/workflows/deploy.yml](.github/workflows/deploy.yml) builds `dist/` and publishes it to Pages.

The Vite config uses a relative base path so the app can be hosted from a project page URL without manual asset rewriting.

## Tests

```bash
npm run test
```

## Lint / Typecheck

```bash
npm run lint
```

## XML Import Format

The current parser supports the legacy corpus pattern discovered in the original tool:

- Root wrapper such as `DOC`
- Sentence wrappers such as `Sentence`, `Sent`, or `S`
- Token nodes such as `W`
- Annotation wrappers such as `NUMEX`, `ENAMEX`, and `TIMEX`

The parser preserves sentence and annotation attributes where possible and records the original sentence XML snapshot for compatibility checks.

## Supported Languages

The legacy tool was used for Marathi and other Indic corpora, with a Devanagari-first UI. The new scaffold is language-agnostic and is ready for per-language rendering rules. Urdu RTL support, script-specific fonts, and the language registry are still pending in the next migration milestone.

## Keyboard Shortcuts

The modern shell currently exposes these actions through buttons and the command palette scaffold:

- Command palette
- Theme toggle
- Undo
- Redo
- Load sample XML
- Export corrected XML
- Export IOB2

The legacy numeric shortcut registry and pointer workflows are preserved in the backup and still need to be reintroduced in the React layer.

## Data Persistence

The legacy app used `localStorage` for auto-save. The current React scaffold does not yet persist the full corpus to IndexedDB. That migration is planned for the next milestone.

## Export Formats

- Corrected XML
- IOB2 / CoNLL-style token export

## Validation Rules

Current validation covers:

- Missing annotation ID
- Missing annotation TYPE
- Empty annotation spans
- Duplicate annotation IDs

Additional sentence-level and corpus-level rules from the legacy tool are documented in [MIGRATION.md](MIGRATION.md).

## Audit Log

The typed audit event schema is defined in `src/lib/types.ts`. The current scaffold stores the event model but has not yet added the durable audit timeline UI or IndexedDB persistence.

## Migration Notes

The legacy implementation is preserved verbatim in [legacy/index.original.html](legacy/index.original.html). The new app currently covers the initial shell, parser, serializer, validation, and export foundation. Advanced workflows such as token splitting, annotation merging, boundary drag handles, offline recovery, and the research audit dashboard remain to be completed in follow-up milestones.

## Known Limitations

- Urdu RTL rendering is not yet implemented.
- IndexedDB persistence is not yet wired.
- Full undo/redo command objects are still simplified.
- Advanced merge/split/boundary workflows are not yet in the React UI.
- XML round-trip fidelity is currently validated on the discovered legacy sample structure, not on every corpus variant.

## Legacy Backup

The original application was backed up before the rewrite at [legacy/index.original.html](legacy/index.original.html).
