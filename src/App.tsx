import { useMemo, useRef, useState } from 'react';
import { Download, FileText, MoonStar, Search, SunMedium, Undo2, Redo2 } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { usePushpakStore } from './stores/usePushpakStore';

const SAMPLE_XML = `<DOC>
  <Sentence ID="1">
    <W>तो</W>
    <NUMEX ID="31" TYPE="QUANTITY"><W>रंगाचे,</W><W>२०-४०</W><W>सेमी</W></NUMEX>
    <W>लांब</W>
    <W>होता</W>
    <W>.</W>
  </Sentence>
  <Sentence ID="2">
    <W>एक</W>
    <W>माणूस</W>
    <W>आला</W>
    <W>.</W>
  </Sentence>
</DOC>`;

function download(content: string, filename: string, mime = 'application/xml'): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function CommandPalette(): JSX.Element | null {
  const open = usePushpakStore((state) => state.commandPaletteOpen);
  const setOpen = usePushpakStore((state) => state.setCommandPaletteOpen);
  const loadXml = usePushpakStore((state) => state.loadXml);
  const toggleTheme = usePushpakStore((state) => state.toggleTheme);
  const exportXml = usePushpakStore((state) => state.exportXml);
  const project = usePushpakStore((state) => state.project);

  if (!open) return null;

  return (
    <div className="palette-backdrop" role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
      <div className="palette" onClick={(event) => event.stopPropagation()}>
        <input className="palette-input" placeholder="Search commands or jump to sentence..." autoFocus />
        <div className="palette-list">
          <button type="button" className="palette-item" onClick={() => loadXml(SAMPLE_XML, 'sample.xml')}>
            Load sample XML
          </button>
          <button type="button" className="palette-item" onClick={() => download(exportXml(), `${project?.name || 'pushpak'}.xml`)}>
            Export corrected XML
          </button>
          <button type="button" className="palette-item" onClick={() => toggleTheme()}>
            Toggle theme
          </button>
        </div>
      </div>
    </div>
  );
}

function SentenceList(): JSX.Element {
  const project = usePushpakStore((state) => state.project);
  const activeSentenceId = usePushpakStore((state) => state.activeSentenceId);
  const selectSentence = usePushpakStore((state) => state.selectSentence);
  const query = usePushpakStore((state) => state.query);
  const parentRef = useRef<HTMLDivElement | null>(null);
  const sentences = project?.sentences.filter((sentence) => {
    if (!query.trim()) return true;
    const needle = query.trim().toLowerCase();
    return sentence.id.toLowerCase().includes(needle) || sentence.rawText.toLowerCase().includes(needle);
  }) || [];
  const virtualizer = useVirtualizer({
    count: sentences.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 88,
    overscan: 8,
  });

  return (
    <div className="sidebar-panel sidebar-scroll" ref={parentRef}>
      <div style={{ position: 'relative', height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const sentence = sentences[virtualItem.index];
          return (
            <button
              key={sentence.id}
              type="button"
              className={`sentence-item ${activeSentenceId === sentence.id ? 'active' : ''}`}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, transform: `translateY(${virtualItem.start}px)` }}
              onClick={() => selectSentence(sentence.id)}
            >
              <div className="sentence-item-id">{sentence.id}</div>
              <div className="sentence-item-text">{sentence.rawText}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SentenceCanvas(): JSX.Element {
  const project = usePushpakStore((state) => state.project);
  const activeSentenceId = usePushpakStore((state) => state.activeSentenceId);
  const selectedTokenIds = usePushpakStore((state) => state.selectedTokenIds);
  const selectedAnnotationId = usePushpakStore((state) => state.selectedAnnotationId);
  const selectToken = usePushpakStore((state) => state.selectToken);
  const createAnnotation = usePushpakStore((state) => state.createAnnotation);
  const clearSelection = usePushpakStore((state) => state.clearSelection);
  const setSelectedAnnotation = usePushpakStore((state) => state.setSelectedAnnotation);

  const sentence = project?.sentences.find((item) => item.id === activeSentenceId) || project?.sentences[0];
  const tokens = sentence?.tokenIds
    .map((tokenId) => project?.tokens[tokenId])
    .filter((token): token is NonNullable<typeof token> => Boolean(token)) || [];
  const annotations = sentence?.annotationIds
    .map((annotationId) => project?.annotations[annotationId])
    .filter((annotation): annotation is NonNullable<typeof annotation> => Boolean(annotation)) || [];

  if (!project || !sentence) {
    return <div className="canvas-empty">Load an XML corpus to start correcting annotations.</div>;
  }

  return (
    <div className="canvas-shell">
      <div className="canvas-header">
        <div>
          <div className="canvas-title">Sentence {sentence.ordinal + 1}</div>
          <div className="canvas-subtitle">{sentence.id}</div>
        </div>
        <div className="canvas-actions">
          <button type="button" className="ghost-button" onClick={() => createAnnotation('NUMEX', 'OTHER')} disabled={selectedTokenIds.length === 0}>
            Create annotation
          </button>
          <button type="button" className="ghost-button" onClick={() => clearSelection()}>
            Clear selection
          </button>
        </div>
      </div>
      <div className="annotation-strip">
        {annotations.map((annotation) => (
          <button
            key={annotation.id}
            type="button"
            className={`annotation-chip ${selectedAnnotationId === annotation.id ? 'selected' : ''}`}
            onClick={() => setSelectedAnnotation(annotation.id)}
          >
            {annotation.tagName}:{annotation.type} #{annotation.id}
          </button>
        ))}
      </div>
      <div className="token-grid">
        {tokens.map((token) => {
          const selected = selectedTokenIds.includes(token.id);
          return (
            <button
              key={token.id}
              type="button"
              className={`token-pill ${selected ? 'selected' : ''}`}
              onPointerDown={() => selectToken(token.id)}
              onClick={() => selectToken(token.id, true)}
            >
              {token.surface}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Inspector(): JSX.Element {
  const project = usePushpakStore((state) => state.project);
  const selectedAnnotationId = usePushpakStore((state) => state.selectedAnnotationId);
  const changeAnnotationType = usePushpakStore((state) => state.changeAnnotationType);
  const changeAnnotationSubtype = usePushpakStore((state) => state.changeAnnotationSubtype);
  const changeAnnotationId = usePushpakStore((state) => state.changeAnnotationId);
  const deleteAnnotation = usePushpakStore((state) => state.deleteAnnotation);
  const issues = usePushpakStore((state) => state.issues);
  const annotation = selectedAnnotationId && project ? project.annotations[selectedAnnotationId] : undefined;

  return (
    <div className="sidebar-panel inspector-panel">
      {annotation ? (
        <>
          <div className="inspector-title">Annotation</div>
          <div className="inspector-meta">{annotation.tagName} #{annotation.id}</div>
          <label className="field">
            <span>TYPE</span>
            <input value={annotation.type} onChange={(event) => changeAnnotationType(annotation.id, event.target.value)} />
          </label>
          <label className="field">
            <span>SUBTYPE</span>
            <input value={annotation.subtype || ''} onChange={(event) => changeAnnotationSubtype(annotation.id, event.target.value)} />
          </label>
          <label className="field">
            <span>ID</span>
            <input value={annotation.id} onChange={(event) => changeAnnotationId(annotation.id, event.target.value)} />
          </label>
          <button type="button" className="danger-button" onClick={() => deleteAnnotation(annotation.id)}>
            Delete annotation
          </button>
        </>
      ) : (
        <div className="inspector-empty">Select an annotation to edit its attributes and boundaries.</div>
      )}
      <div className="inspector-title" style={{ marginTop: 20 }}>Validation</div>
      <div className="validation-list">
        {issues.length === 0 ? <div className="inspector-empty">No issues detected.</div> : issues.map((issue) => <div key={issue.issueId} className={`issue issue-${issue.severity}`}>{issue.message}</div>)}
      </div>
    </div>
  );
}

export function App(): JSX.Element {
  const theme = usePushpakStore((state) => state.theme);
  const saveStatus = usePushpakStore((state) => state.saveStatus);
  const project = usePushpakStore((state) => state.project);
  const loadXml = usePushpakStore((state) => state.loadXml);
  const undo = usePushpakStore((state) => state.undo);
  const redo = usePushpakStore((state) => state.redo);
  const toggleTheme = usePushpakStore((state) => state.toggleTheme);
  const setCommandPaletteOpen = usePushpakStore((state) => state.setCommandPaletteOpen);
  const setQuery = usePushpakStore((state) => state.setQuery);
  const exportXml = usePushpakStore((state) => state.exportXml);
  const exportIob2 = usePushpakStore((state) => state.exportIob2);
  const [fileName, setFileName] = useState('');

  const stats = useMemo(() => {
    if (!project) return { total: 0, done: 0, remaining: 0, annotations: 0, errors: 0 };
    return {
      total: project.sentences.length,
      done: project.sentences.filter((sentence) => sentence.status === 'done').length,
      remaining: project.sentences.filter((sentence) => sentence.status !== 'done').length,
      annotations: Object.keys(project.annotations).length,
      errors: project.sentences.filter((sentence) => sentence.status === 'error').length,
    };
  }, [project]);

  return (
    <div className={`app-shell theme-${theme}`}>
      <header className="topbar">
        <div>
          <div className="brand">Pushpak</div>
          <div className="brand-subtitle">Desktop-class NE annotation correction for multilingual Indic corpora</div>
        </div>
        <div className="topbar-actions">
          <label className="file-button">
            <input type="file" accept=".xml,text/xml,application/xml" onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setFileName(file.name);
              file.text().then((text) => loadXml(text, file.name));
            }} />
            Load XML
          </label>
          <button type="button" className="ghost-button" onClick={() => loadXml(SAMPLE_XML, 'sample.xml')}>Load sample</button>
          <button type="button" className="ghost-button" onClick={() => setCommandPaletteOpen(true)}><Search size={16} /> Command palette</button>
          <button type="button" className="ghost-button" onClick={() => toggleTheme()}>{theme === 'dark' ? <SunMedium size={16} /> : <MoonStar size={16} />} Theme</button>
          <button type="button" className="ghost-button" onClick={() => undo()}><Undo2 size={16} /> Undo</button>
          <button type="button" className="ghost-button" onClick={() => redo()}><Redo2 size={16} /> Redo</button>
          <button type="button" className="primary-button" onClick={() => download(exportXml(), `${fileName.replace(/\.xml$/i, '') || 'pushpak'}_corrected.xml`)}><Download size={16} /> Export XML</button>
          <button type="button" className="ghost-button" onClick={() => download(exportIob2(), `${fileName.replace(/\.xml$/i, '') || 'pushpak'}_iob2.tsv`, 'text/tab-separated-values')}><FileText size={16} /> Export IOB2</button>
        </div>
      </header>
      <main className="workspace">
        <aside className="left-rail">
          <div className="sidebar-panel">
            <label className="field">
              <span>Search</span>
              <input placeholder="Sentence ID or text" onChange={(event) => setQuery(event.target.value)} />
            </label>
            <div className="status-grid">
              <div><strong>{stats.total}</strong><span>sentences</span></div>
              <div><strong>{stats.annotations}</strong><span>annotations</span></div>
              <div><strong>{stats.errors}</strong><span>errors</span></div>
              <div><strong>{saveStatus}</strong><span>save state</span></div>
            </div>
          </div>
          <SentenceList />
        </aside>
        <section className="center-stage">
          <SentenceCanvas />
        </section>
        <aside className="right-rail">
          <Inspector />
        </aside>
      </main>
      <footer className="statusbar">
        <span>{project?.name || 'No project loaded'}</span>
        <span>{stats.done}/{stats.total} completed</span>
        <span>{stats.remaining} remaining</span>
        <span>{project?.language || 'language unset'}</span>
        <span>{saveStatus}</span>
      </footer>
      <CommandPalette />
    </div>
  );
}

export default App;