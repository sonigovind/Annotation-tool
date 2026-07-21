import type { CorpusProject, ValidationIssue } from './types';

export function validateProject(project: CorpusProject): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seenIds = new Map<string, number>();

  Object.values(project.annotations).forEach((annotation) => {
    if (!annotation.id) {
      issues.push({
        issueId: `issue-${issues.length + 1}`,
        code: 'MISSING_REQUIRED_ATTRIBUTE',
        severity: 'error',
        message: 'Annotation is missing an ID attribute.',
        sentenceId: annotation.sentenceId,
        annotationId: annotation.id,
      });
    } else {
      seenIds.set(annotation.id, (seenIds.get(annotation.id) || 0) + 1);
    }

    if (!annotation.type) {
      issues.push({
        issueId: `issue-${issues.length + 1}`,
        code: 'MISSING_REQUIRED_ATTRIBUTE',
        severity: 'error',
        message: `Annotation ${annotation.id || '?'} is missing TYPE.`,
        sentenceId: annotation.sentenceId,
        annotationId: annotation.id,
      });
    }

    if (annotation.tokenIds.length === 0) {
      issues.push({
        issueId: `issue-${issues.length + 1}`,
        code: 'EMPTY_ENTITY',
        severity: 'error',
        message: `Annotation ${annotation.id} has no tokens.`,
        sentenceId: annotation.sentenceId,
        annotationId: annotation.id,
      });
    }
  });

  seenIds.forEach((count, id) => {
    if (count > 1) {
      const annotation = Object.values(project.annotations).find((item) => item.id === id);
      issues.push({
        issueId: `issue-${issues.length + 1}`,
        code: 'DUPLICATE_ENTITY_ID',
        severity: 'error',
        message: `Duplicate annotation ID ${id}.`,
        sentenceId: annotation?.sentenceId || '',
        annotationId: id,
      });
    }
  });

  return issues;
}