export const LIST_PAGE_SIZE = 10;

export type ListSearchParams = Promise<Record<string, string | string[] | undefined>>;

export function readListQuery(params: Record<string, string | string[] | undefined>) {
  const rawQuery = typeof params.q === 'string' ? params.q : '';
  const query = rawQuery.trim().replace(/\s+/g, ' ').slice(0, 100);
  const rawPage = typeof params.page === 'string' ? params.page : '';
  const requestedPage = /^[1-9]\d{0,5}$/.test(rawPage) ? Number(rawPage) : 1;
  return { query, requestedPage };
}

export function searchTerms(query: string) {
  return query.split(' ').filter(Boolean).slice(0, 8).map((term) =>
    new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
}

export function pageForTotal(requestedPage: number, total: number) {
  return Math.min(requestedPage, Math.max(1, Math.ceil(total / LIST_PAGE_SIZE)));
}
