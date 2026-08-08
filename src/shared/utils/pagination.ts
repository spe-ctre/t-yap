/**
 * Shared pagination helpers - replaces the same page/limit/skip parsing and
 * totalPages calculation that was previously hand-copied in 12 separate
 * places (driver, agent, park-management x4, notifications, vas x4).
 */

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Parses page/limit from either query-string values (strings) or already
 * numeric values, validates they're positive, and computes the Prisma
 * `skip` offset. Invalid or missing values fall back to page 1 and the
 * given default limit - this is slightly stricter than some of the original
 * call sites (a couple didn't validate for 0/negative at all), which only
 * makes previously-unhandled bad input behave more predictably, not less.
 */
export function getPaginationParams(
  input: { page?: string | number; limit?: string | number },
  defaultLimit: number = 20
): PaginationParams {
  const rawPage = Number(input.page);
  const rawLimit = Number(input.limit);

  const page = rawPage > 0 ? rawPage : 1;
  const limit = rawLimit > 0 ? rawLimit : defaultLimit;
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Builds the standard pagination metadata object returned alongside a
 * paginated list.
 */
export function buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}