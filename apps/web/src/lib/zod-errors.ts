import { ZodError } from 'zod';

export const mapZodErrors = <T extends string>(
  error: ZodError,
): Partial<Record<T, string>> => {
  const fieldErrors: Partial<Record<T, string>> = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === 'string' && !fieldErrors[field as T]) {
      fieldErrors[field as T] = issue.message;
    }
  }

  return fieldErrors;
};
