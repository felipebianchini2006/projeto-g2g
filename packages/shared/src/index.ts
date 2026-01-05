export type Identifier = string;

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export const toPositiveInt = (value: unknown): Result<number> => {
  let parsed: number;
  try {
    parsed = Number(value);
  } catch {
    return { ok: false, error: 'Expected a positive integer.' };
  }
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return { ok: false, error: 'Expected a positive integer.' };
  }
  return { ok: true, value: parsed };
};
