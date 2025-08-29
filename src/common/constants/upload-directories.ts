/**
 * Constants for different upload directory names
 * These will be combined with the base upload path from environment variables
 */
export const UPLOAD_DIRECTORIES = {
  PROFILE_PICTURES: 'profile-pictures',
  DOCUMENTS: 'documents',
  QUESTION_IMAGES: 'question-images',
  QUESTION_SET_IMAGES: 'question-set-images',
  CERTIFICATES: 'certificates',
  TEMP: 'temp',
} as const;

export type UploadDirectory =
  (typeof UPLOAD_DIRECTORIES)[keyof typeof UPLOAD_DIRECTORIES];
