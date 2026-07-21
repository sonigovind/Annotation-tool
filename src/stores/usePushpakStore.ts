import { create } from 'zustand';
import { exportIob2 } from '../lib/export';
import { parseXmlCorpus, serializeProjectXml } from '../lib/xml';
import { validateProject } from '../lib/validation';
import type { AuditEvent, CorpusProject, EntityAnnotation, Token, ValidationIssue } from '../lib/types';

interface HistoryEntry {
  label: string;
  snapshot: CorpusProject;
  issues: ValidationIssue[];
  auditEvents: AuditEvent[];
}

interface AppState {
  project: CorpusProject | null;
  issues: ValidationIssue[];
  auditEvents: AuditEvent[];
  activeSentenceId: string | null;
  selectedTokenIds: string[];
  selectedAnnotationId: string | null;
  query: string;
  theme: 'light' | 'dark';
  saveStatus: 'Saved' | 'Saving' | 'Unsaved changes' | 'Save failed' | 'Recovered';
  history: HistoryEntry[];
  future: HistoryEntry[];
  commandPaletteOpen: boolean;
  loadXml: (xml: string, name?: string) => void;
  selectSentence: (sentenceId: string) => void;
  setQuery: (query: string) => void;
  selectToken: (tokenId: string, extend?: boolean) => void;
  clearSelection: () => void;
  setSelectedAnnotation: (annotationId: string | null) => void;
  createAnnotation: (tagName: string, type: string) => void;
  changeAnnotationType: (annotationId: string, type: string) => void;
  changeAnnotationSubtype: (annotationId: string, subtype: string) => void;
  changeAnnotationId: (annotationId: string, nextId: string) => void;
  deleteAnnotation: (annotationId: string) => void;
  undo: () => void;
  redo: () => void;
  toggleTheme: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  exportXml: () => string;
  exportIob2: () => string;
}

function cloneProject(project: CorpusProject): CorpusProject {
  return JSON.parse(JSON.stringify(project)) as CorpusProject;
}

function captureHistory(project: CorpusProject, issues: ValidationIssue[], auditEvents: AuditEvent[], label: string): HistoryEntry {
  return {
    label,
    snapshot: cloneProject(project),
    issues: JSON.parse(JSON.stringify(issues)) as ValidationIssue[],
    auditEvents: JSON.parse(JSON.stringify(auditEvents)) as AuditEvent[],
  };
}

function nextAnnotationId(project: CorpusProject): string {
  const numericIds = Object.values(project.annotations)
    .map((annotation) => Number.parseInt(annotation.id, 10))
    .filter((id) => Number.isFinite(id));
  if (numericIds.length > 0) return String(Math.max(...numericIds) + 1);
  return `a-${Object.keys(project.annotations).length + 1}`;
}

function commitFromProject(state: AppState, nextProject: CorpusProject, label: string, selectedAnnotationId: string | null = null, selectedTokenIds: string[] = []): Partial<AppState> {
  const historyEntry = state.project ? captureHistory(state.project, state.issues, state.auditEvents, label) : null;
  const issues = validateProject(nextProject);
  return {
    project: nextProject,
    issues,
    selectedAnnotationId,
    selectedTokenIds,
    history: historyEntry ? [...state.history, historyEntry].slice(-200) : state.history,
    future: [],
    saveStatus: 'Unsaved changes',
  };
}

export const usePushpakStore = create<AppState>((set, get) => ({
  project: null,
  issues: [],
  auditEvents: [],
  activeSentenceId: null,
  selectedTokenIds: [],
  selectedAnnotationId: null,
  query: '',
  theme: 'dark',
  saveStatus: 'Saved',
  history: [],
  future: [],
  commandPaletteOpen: false,
  loadXml: (xml, name = 'annotations.xml') => {
    const project = parseXmlCorpus(xml, name);
    const issues = validateProject(project);
    set({
      project,
      issues,
      auditEvents: [],
      activeSentenceId: project.sentences[0]?.id || null,
      selectedTokenIds: [],
      selectedAnnotationId: null,
      history: [],
      future: [],
      saveStatus: 'Saved',
    });
  },
  selectSentence: (sentenceId) => set({ activeSentenceId: sentenceId, selectedTokenIds: [], selectedAnnotationId: null }),
  setQuery: (query) => set({ query }),
  selectToken: (tokenId, extend = false) => {
    const current = get().selectedTokenIds;
    const next = extend ? Array.from(new Set([...current, tokenId])) : [tokenId];
    set({ selectedTokenIds: next, selectedAnnotationId: null });
  },
  clearSelection: () => set({ selectedTokenIds: [], selectedAnnotationId: null }),
  setSelectedAnnotation: (annotationId) => set({ selectedAnnotationId: annotationId, selectedTokenIds: [] }),
  createAnnotation: (tagName, type) => {
    const state = get();
    if (!state.project || state.selectedTokenIds.length === 0) return;
    const project = cloneProject(state.project);
    const tokenIds = [...state.selectedTokenIds];
    const firstToken = project.tokens[tokenIds[0]];
    if (!firstToken) return;
    const sentence = project.sentences.find((item) => item.id === firstToken.sentenceId);
    if (!sentence) return;
    const annotationId = nextAnnotationId(project);
    const annotation: EntityAnnotation = {
      id: annotationId,
      sentenceId: sentence.id,
      type,
      startTokenId: tokenIds[0],
      endTokenId: tokenIds[tokenIds.length - 1],
      tokenIds,
      source: 'manual',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tagName,
      attributes: { ID: annotationId, TYPE: type },
    };
    project.annotations[annotationId] = annotation;
    sentence.annotationIds = [...sentence.annotationIds, annotationId];
    sentence.revision += 1;
    sentence.status = 'in-progress';
    set(commitFromProject(state, project, 'create annotation', annotationId, []));
  },
  changeAnnotationType: (annotationId, type) => {
    const state = get();
    if (!state.project) return;
    const project = cloneProject(state.project);
    const annotation = project.annotations[annotationId];
    if (!annotation) return;
    annotation.type = type;
    annotation.attributes.TYPE = type;
    annotation.updatedAt = Date.now();
    set(commitFromProject(state, project, 'change annotation type', annotationId));
  },
  changeAnnotationSubtype: (annotationId, subtype) => {
    const state = get();
    if (!state.project) return;
    const project = cloneProject(state.project);
    const annotation = project.annotations[annotationId];
    if (!annotation) return;
    annotation.subtype = subtype;
    annotation.attributes.SUBTYPE = subtype;
    annotation.updatedAt = Date.now();
    set(commitFromProject(state, project, 'change annotation subtype', annotationId));
  },
  changeAnnotationId: (annotationId, nextId) => {
    const state = get();
    if (!state.project) return;
    const project = cloneProject(state.project);
    const annotation = project.annotations[annotationId];
    if (!annotation) return;
    delete project.annotations[annotationId];
    annotation.id = nextId;
    annotation.attributes.ID = nextId;
    project.annotations[nextId] = annotation;
    project.sentences.forEach((sentence) => {
      sentence.annotationIds = sentence.annotationIds.map((id) => (id === annotationId ? nextId : id));
    });
    set(commitFromProject(state, project, 'change annotation id', nextId));
  },
  deleteAnnotation: (annotationId) => {
    const state = get();
    if (!state.project) return;
    const project = cloneProject(state.project);
    const annotation = project.annotations[annotationId];
    if (!annotation) return;
    const sentence = project.sentences.find((item) => item.id === annotation.sentenceId);
    if (sentence) sentence.annotationIds = sentence.annotationIds.filter((id) => id !== annotationId);
    delete project.annotations[annotationId];
    set(commitFromProject(state, project, 'delete annotation', null, []));
  },
  undo: () => {
    const state = get();
    const last = state.history.at(-1);
    if (!last) return;
    const futureEntry = state.project ? captureHistory(state.project, state.issues, state.auditEvents, `redo of ${last.label}`) : null;
    set({
      project: last.snapshot,
      issues: last.issues,
      auditEvents: last.auditEvents,
      history: state.history.slice(0, -1),
      future: futureEntry ? [...state.future, futureEntry].slice(-200) : state.future,
      saveStatus: 'Unsaved changes',
      selectedAnnotationId: null,
      selectedTokenIds: [],
    });
  },
  redo: () => {
    const state = get();
    const next = state.future.at(-1);
    if (!next) return;
    set({
      project: next.snapshot,
      issues: next.issues,
      auditEvents: next.auditEvents,
      future: state.future.slice(0, -1),
      history: [...state.history, captureHistory(next.snapshot, next.issues, next.auditEvents, 'redo')].slice(-200),
      saveStatus: 'Unsaved changes',
    });
  },
  toggleTheme: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  exportXml: () => {
    const project = get().project;
    return project ? serializeProjectXml(project) : '';
  },
  exportIob2: () => {
    const project = get().project;
    return project ? exportIob2(project) : '';
  },
}));