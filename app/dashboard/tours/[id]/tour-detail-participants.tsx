'use client';

import { useCallback, useEffect, useState } from 'react';

type Participant = { id: string; fullName: string; phone: string };
type ParticipantPage = { participants: Participant[]; page: number; pageSize: number; total: number; totalPages: number };

const emptyPage: ParticipantPage = { participants: [], page: 1, pageSize: 20, total: 0, totalPages: 1 };

export default function TourDetailParticipants({ tourId }: { tourId: string }) {
  const [result, setResult] = useState(emptyPage);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadParticipants = useCallback(async (nextPage: number, signal?: AbortSignal) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/tours/${tourId}/participants?page=${nextPage}`, { cache: 'no-store', signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Katılımcılar yüklenemedi.');
      setResult(data as ParticipantPage);
    } catch (cause) {
      if (cause instanceof Error && cause.name === 'AbortError') return;
      setError(cause instanceof Error ? cause.message : 'Katılımcılar yüklenemedi.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [tourId]);

  useEffect(() => {
    const controller = new AbortController();
    void loadParticipants(page, controller.signal);
    return () => controller.abort();
  }, [loadParticipants, page]);

  return <section className="tour-participants-card tour-detail-participants" aria-labelledby="tour-participants-title">
    <div className="tour-participants-heading">
      <div><h2 id="tour-participants-title">Katılımcılar</h2><span>{result.total} kişi</span></div>
    </div>
    {error && <p className="tour-participant-feedback form-error" role="alert">{error}</p>}
    <div className="table-scroll">
      <table className="users-table tour-participants-table">
        <thead><tr><th>Ad Soyad</th><th>Telefon Numarası</th></tr></thead>
        <tbody>
          {loading ? <tr><td colSpan={2} className="tour-participants-empty">Katılımcılar yükleniyor…</td></tr>
            : result.participants.length === 0 ? <tr><td colSpan={2} className="tour-participants-empty">Bu tura henüz katılımcı eklenmedi.</td></tr>
              : result.participants.map((participant) => <tr key={participant.id}>
                <td>{participant.fullName || 'İsimsiz katılımcı'}</td>
                <td>{participant.phone}</td>
              </tr>)}
        </tbody>
      </table>
    </div>
    {result.totalPages > 1 && <div className="list-pagination tour-participants-pagination">
      <span>{result.page} / {result.totalPages}</span>
      <div className="list-pagination-links">
        <button type="button" aria-label="Önceki sayfa" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}>‹</button>
        <button type="button" aria-label="Sonraki sayfa" disabled={page >= result.totalPages || loading} onClick={() => setPage((current) => current + 1)}>›</button>
      </div>
    </div>}
  </section>;
}
