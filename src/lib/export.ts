import type { CorpusProject } from './types';

export function exportIob2(project: CorpusProject): string {
  const annotationByToken = new Map<string, { type: string; isStart: boolean }>();
  Object.values(project.annotations).forEach((annotation) => {
    annotation.tokenIds.forEach((tokenId, index) => {
      annotationByToken.set(tokenId, { type: annotation.type || 'OTHER', isStart: index === 0 });
    });
  });

  return project.sentences
    .map((sentence) => {
      const lines = sentence.tokenIds.map((tokenId) => {
        const token = project.tokens[tokenId];
        const label = annotationByToken.get(tokenId);
        if (!label) return `${token.surface}\tO`;
        return `${token.surface}\t${label.isStart ? 'B' : 'I'}-${label.type}`;
      });
      return [...lines, ''].join('\n');
    })
    .join('\n');
}