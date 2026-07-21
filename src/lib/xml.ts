import type { CorpusProject, EntityAnnotation, Sentence, Token } from './types';

const SENTENCE_TAGS = new Set(['SENTENCE', 'SENT', 'S']);
const TOKEN_TAG = 'W';

function attributesOf(element: Element): Record<string, string> {
  return Array.from(element.attributes).reduce<Record<string, string>>((attributes, attribute) => {
    attributes[attribute.name] = attribute.value;
    return attributes;
  }, {});
}

function isAnnotationTag(tagName: string, annotationTags: string[]): boolean {
  return annotationTags.includes(tagName.toUpperCase());
}

function textTokenSurface(node: Element): string {
  return node.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

function parseSentence(sentenceElement: Element, ordinal: number, annotationTags: string[]): {
  sentence: Sentence;
  tokens: Token[];
  annotations: EntityAnnotation[];
} {
  const sentenceId = sentenceElement.getAttribute('ID') || sentenceElement.getAttribute('Id') || `sentence-${ordinal + 1}`;
  const sentenceXml = new XMLSerializer().serializeToString(sentenceElement);
  const tokenBuffer: Token[] = [];
  const annotations: EntityAnnotation[] = [];
  let tokenIndex = 0;

  const collectTokens = (parent: Element, annotation?: EntityAnnotation): void => {
    Array.from(parent.childNodes).forEach((child) => {
      if (child.nodeType !== Node.ELEMENT_NODE) {
        return;
      }
      const element = child as Element;
      const tagName = element.tagName.toUpperCase();
      if (tagName === TOKEN_TAG) {
        const tokenId = `${sentenceId}:t${tokenIndex + 1}`;
        const surface = textTokenSurface(element);
        const token: Token = {
          id: tokenId,
          sentenceId,
          index: tokenIndex,
          surface,
          normalized: surface,
          startOffset: 0,
          endOffset: surface.length,
          leadingWhitespace: '',
          trailingWhitespace: ' ',
          isPunctuation: /^[\p{P}\p{S}]+$/u.test(surface),
        };
        tokenBuffer.push(token);
        if (annotation) annotation.tokenIds.push(tokenId);
        tokenIndex += 1;
        return;
      }
      if (isAnnotationTag(tagName, annotationTags)) {
        const currentAnnotation: EntityAnnotation = {
          id: element.getAttribute('ID') || `${sentenceId}:a${annotations.length + 1}`,
          sentenceId,
          type: element.getAttribute('TYPE') || element.getAttribute('Type') || '',
          subtype: element.getAttribute('SUBTYPE') || undefined,
          startTokenId: '',
          endTokenId: '',
          tokenIds: [],
          source: 'original',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          tagName: element.tagName,
          attributes: attributesOf(element),
        };
        collectTokens(element, currentAnnotation);
        if (currentAnnotation.tokenIds.length > 0) {
          currentAnnotation.startTokenId = currentAnnotation.tokenIds[0];
          currentAnnotation.endTokenId = currentAnnotation.tokenIds[currentAnnotation.tokenIds.length - 1];
        }
        annotations.push(currentAnnotation);
        return;
      }
      collectTokens(element, annotation);
    });
  };

  collectTokens(sentenceElement);

  const sentence: Sentence = {
    id: sentenceId,
    ordinal,
    rawText: tokenBuffer.map((token) => token.surface).join(' '),
    tokenIds: tokenBuffer.map((token) => token.id),
    annotationIds: annotations.map((annotation) => annotation.id),
    status: 'unreviewed',
    language: sentenceElement.getAttribute('xml:lang') || sentenceElement.getAttribute('LANG') || sentenceElement.getAttribute('LANGUAGE') || '',
    originalXML: sentenceXml,
    revision: 0,
    tagName: sentenceElement.tagName,
    attributes: attributesOf(sentenceElement),
  };

  return { sentence, tokens: tokenBuffer, annotations };
}

export function parseXmlCorpus(sourceXml: string, projectName = 'Pushpak project'): CorpusProject {
  const document = new DOMParser().parseFromString(sourceXml, 'application/xml');
  const parserError = document.querySelector('parsererror');
  if (parserError) throw new Error(parserError.textContent || 'Invalid XML');

  const root = document.documentElement;
  const rootAttributes = attributesOf(root);
  const annotationTags = ['NUMEX', 'ENAMEX', 'TIMEX', 'OTHER'];
  const sentenceElements = Array.from(root.querySelectorAll('*')).filter((element) => SENTENCE_TAGS.has(element.tagName.toUpperCase()));
  const containers = sentenceElements.length > 0 ? sentenceElements : [root];

  const sentences: Sentence[] = [];
  const tokens: Record<string, Token> = {};
  const annotations: Record<string, EntityAnnotation> = {};

  containers.forEach((container, index) => {
    const parsed = parseSentence(container, index, annotationTags);
    sentences.push(parsed.sentence);
    parsed.tokens.forEach((token) => {
      tokens[token.id] = token;
    });
    parsed.annotations.forEach((annotation) => {
      annotations[annotation.id] = annotation;
    });
  });

  return {
    id: `project-${Date.now()}`,
    name: projectName,
    language: root.getAttribute('LANG') || root.getAttribute('xml:lang') || '',
    sourceXml,
    rootTagName: root.tagName,
    rootAttributes,
    sentences,
    tokens,
    annotations,
    annotationTagNames: annotationTags,
    dirty: false,
    revision: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function sentenceNodeFromProject(document: Document, project: CorpusProject, sentence: Sentence): Element {
  const sentenceElement = document.createElement(sentence.tagName);
  Object.entries(sentence.attributes).forEach(([name, value]) => sentenceElement.setAttribute(name, value));

  const annotations = sentence.annotationIds.map((annotationId) => project.annotations[annotationId]).filter(Boolean);
  const annotationStarts = new Map<string, EntityAnnotation>();
  const annotationEnds = new Set<string>();
  annotations.forEach((annotation) => {
    annotationStarts.set(annotation.startTokenId, annotation);
    annotationEnds.add(annotation.endTokenId);
  });

  sentence.tokenIds.forEach((tokenId) => {
    const token = project.tokens[tokenId];
    if (!token) return;
    const annotation = annotationStarts.get(tokenId);
    if (annotation) {
      const annotationElement = document.createElement(annotation.tagName);
      Object.entries(annotation.attributes).forEach(([name, value]) => {
        if (name !== 'ID' && name !== 'TYPE' && name !== 'SUBTYPE') annotationElement.setAttribute(name, value);
      });
      annotationElement.setAttribute('ID', annotation.id);
      if (annotation.type) annotationElement.setAttribute('TYPE', annotation.type);
      if (annotation.subtype) annotationElement.setAttribute('SUBTYPE', annotation.subtype);
      annotation.tokenIds.forEach((annotationTokenId) => {
        const annotationToken = project.tokens[annotationTokenId];
        if (!annotationToken) return;
        const tokenElement = document.createElement(TOKEN_TAG);
        tokenElement.textContent = annotationToken.surface;
        annotationElement.appendChild(tokenElement);
      });
      sentenceElement.appendChild(annotationElement);
      return;
    }
    if (annotationEnds.has(token.id)) return;
    const tokenElement = document.createElement(TOKEN_TAG);
    tokenElement.textContent = token.surface;
    sentenceElement.appendChild(tokenElement);
  });

  return sentenceElement;
}

export function serializeProjectXml(project: CorpusProject): string {
  const xmlDocument = window.document.implementation.createDocument('', project.rootTagName, null);
  const root = xmlDocument.documentElement;
  Object.entries(project.rootAttributes).forEach(([name, value]) => root.setAttribute(name, value));
  project.sentences.forEach((sentence) => root.appendChild(sentenceNodeFromProject(xmlDocument, project, sentence)));
  return new XMLSerializer().serializeToString(xmlDocument);
}