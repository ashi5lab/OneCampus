import { describe, it, expect } from 'vitest';
import { resolveVocabulary } from './vocabulary';

describe('resolveVocabulary', () => {
  it('resolves the school dictionary', () => {
    const vocab = resolveVocabulary('school');
    expect(vocab.instructor).toBe('Teacher');
    expect(vocab.cohort).toBe('Class');
    expect(vocab.topic).toBe('Subject');
    expect(vocab.topics).toBe('Subjects');
  });

  it('resolves the kindergarten dictionary', () => {
    const vocab = resolveVocabulary('kindergarten');
    expect(vocab.learner).toBe('Child');
    expect(vocab.learners).toBe('Children');
    expect(vocab.topic).toBe('Activity');
    expect(vocab.topics).toBe('Activities');
  });

  it('resolves the college dictionary', () => {
    const vocab = resolveVocabulary('college');
    expect(vocab.cohort).toBe('Course Section');
    expect(vocab.topic).toBe('Course');
    expect(vocab.topics).toBe('Courses');
  });

  it('falls back to the school dictionary for an unknown org type', () => {
    expect(resolveVocabulary('spaceship')).toEqual(resolveVocabulary('school'));
    expect(resolveVocabulary(undefined)).toEqual(resolveVocabulary('school'));
  });

  it('lets a per-tenant override win over the org-type default', () => {
    const vocab = resolveVocabulary('school', { topic: 'Module' });
    expect(vocab.topic).toBe('Module');
    // unrelated keys are untouched by the override
    expect(vocab.instructor).toBe('Teacher');
  });
});
