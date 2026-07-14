// Mirrors OneCampus_App_Specification.md Part 5. `learner` isn't in the
// spec's example dictionary but every screen needs a label for the core
// entity, so it's added here following the same pattern.
const VOCABULARY = {
  kindergarten: {
    instructor: 'Caregiver',
    instructors: 'Caregivers',
    cohort: 'Playgroup',
    cohorts: 'Playgroups',
    topic: 'Activity',
    leader: 'Director',
    term: 'Period',
    learner: 'Child',
    learners: 'Children'
  },
  school: {
    instructor: 'Teacher',
    instructors: 'Teachers',
    cohort: 'Class',
    cohorts: 'Classes',
    topic: 'Subject',
    leader: 'Principal',
    term: 'Term',
    learner: 'Student',
    learners: 'Students'
  },
  college: {
    instructor: 'Professor',
    instructors: 'Professors',
    cohort: 'Course Section',
    cohorts: 'Course Sections',
    topic: 'Course',
    leader: 'Dean',
    term: 'Semester',
    learner: 'Student',
    learners: 'Students'
  }
};

// Per-tenant overrides (config.vocabulary_override) win over the org-type
// default for any key they set.
export function resolveVocabulary(orgType, overrides = {}) {
  const base = VOCABULARY[orgType] || VOCABULARY.school;
  return { ...base, ...overrides };
}
