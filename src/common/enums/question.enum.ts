export enum QuestionType {
  LONG = 'long',
  SHORT = 'short',
  MCQ = 'mcq',
  TRUE_OR_FALSE = 'true-or-false',
  FILL_IN_THE_BLANKS = 'fill-in-the-blanks',
}

export enum DifficultyLevel {
  LEVEL1 = 1,
  LEVEL2 = 2,
  LEVEL3 = 3,
  LEVEL4 = 4,
  LEVEL5 = 5,
}

export enum QuestionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  DRAFT = 'draft',
}
