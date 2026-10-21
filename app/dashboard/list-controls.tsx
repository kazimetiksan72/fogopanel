import Link from 'next/link';
import { LIST_PAGE_SIZE } from '@/lib/list-query';

export function ListSearch({ path, query, placeholder, total }: {
  path: string;
  query: string;
  placeholder: string;
  total: number;
}) {
  const inputId = `list-search-${path.split('/').pop()}`;
  return <div className="list-search-bar">
    <form action={path} method="get" role="search" className="list-search-form">
      <label htmlFor={inputId} className="visually-hidden">{placeholder}</label>
      <input id={inputId} type="search" name="q" defaultValue={query} maxLength={100} placeholder={placeholder} />
      <button type="submit">Ara</button>
      {query && <Link href={path} className="list-search-clear">Temizle</Link>}
    </form>
    <span className="list-search-count">{total.toLocaleString('tr-TR')} kayıt</span>
  </div>;
}

export function ListPagination({ path, query, page, total }: {
  path: string;
  query: string;
  page: number;
  total: number;
}) {
  if (!total) return null;
  const totalPages = Math.ceil(total / LIST_PAGE_SIZE);
  const first = (page - 1) * LIST_PAGE_SIZE + 1;
  const last = Math.min(page * LIST_PAGE_SIZE, total);
  const firstPageInWindow = Math.max(1, Math.min(page - 2, totalPages - 4));
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, index) => firstPageInWindow + index);
  const href = (targetPage: number) => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (targetPage > 1) params.set('page', String(targetPage));
    const search = params.toString();
    return search ? `${path}?${search}` : path;
  };

  return <div className="list-pagination">
    <span>{first}–{last} / {total.toLocaleString('tr-TR')} kayıt</span>
    {totalPages > 1 && <nav className="list-pagination-links" aria-label="Sayfalar">
      {page > 1 ? <Link href={href(page - 1)} aria-label="Önceki sayfa">‹</Link> : <span className="disabled" aria-hidden="true">‹</span>}
      {pages.map((number) => <Link key={number} href={href(number)} aria-current={number === page ? 'page' : undefined} className={number === page ? 'active' : undefined}>{number}</Link>)}
      {page < totalPages ? <Link href={href(page + 1)} aria-label="Sonraki sayfa">›</Link> : <span className="disabled" aria-hidden="true">›</span>}
    </nav>}
  </div>;
}
