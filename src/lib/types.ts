export type EntityType = 'ENAMEX' | 'NUMEX' | 'TIMEX' | 'OTHER';

export type AnnotationStatus = 'unreviewed' | 'in-progress' | 'done' | 'error';

export interface Token {
  id: string;
  sentenceId: string;
  index: number;
  surface: string;
  normalized?: string;
  startOffset: number;
  endOffset: number;
  leadingWhitespace: string;
  trailingWhitespace: string;
  isPunctuation: boolean;
  splitFromTokenId?: string;
}

export interface EntityAnnotation {
  id: string;
  sentenceId: string;
  type: string;
  subtype?: string;
  startTokenId: string;
  endTokenId: string;
  tokenIds: string[];
  source: 'original' | 'manual' | 'automatic';
  confidence?: number;
  createdAt: number;
  updatedAt: number;
  tagName: string;
  attributes: Record<string, string>;
}

export interface Sentence {
  id: string;
  ordinal: number;
  rawText: string;
  tokenIds: string[];
  annotationIds: string[];
  status: AnnotationStatus;
  language: string;
  originalXML: string;
  revision: number;
  tagName: string;
  attributes: Record<string, string>;
}

export interface AuditEvent {
  id: string;
  projectId: string;
  sentenceId: string;
  annotationId?: string;
  tokenIds?: string[];
  type: string;
  action: string;
  before: unknown;
  after: unknown;
  actorId?: string;
  sessionId: string;
  timestamp: number;
  applicationVersion: string;
}

export interface ValidationIssue {
  issueId: string;
  code: string;
  severity: 'error' | 'warn' | 'info';
  message: string;
  sentenceId: string;
  annotationId?: string;
  tokenId?: string;
  suggestedFix?: string;
}

export interface CorpusProject {
  id: string;
  name: string;
  language: string;
  sourceXml: string;
  rootTagName: string;
  rootAttributes: Record<string, string>;
  sentences: Sentence[];
  tokens: Record<string, Token>;
  annotations: Record<string, EntityAnnotation>;
  annotationTagNames: string[];
  dirty: boolean;
  revision: number;
  createdAt: number;
  updatedAt: number;
}

export interface CorpusSnapshot {
  project: CorpusProject;
  issues: ValidationIssue[];
  auditEvents: AuditEvent[];
}