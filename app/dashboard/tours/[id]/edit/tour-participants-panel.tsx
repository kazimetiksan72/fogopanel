'use client';

import { useCallback, useEffect, useState } from 'react';

type Participant = { id: string; fullName: string; phone: string };
type ParticipantPage = { participants: Participant[]; page: number; pageSize: number; total: number; totalPages: number };
type Draft = { fullName: string; phone: string };

const emptyDraft: Draft = { fullName: '', phone: '' };

export default function TourParticipantsPanel({ tourId }: { tourId: string }) {
  const [result, setResult] = useState<ParticipantPage>({ participants: [], page: 1, pageSize: 20, total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadPage = useCallback(async (nextPage: number) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/tours/${tourId}/participants?page=${nextPage}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Katılımcılar yüklenemedi.');
      setResult(data as ParticipantPage);
      if (nextPage > data.totalPages) setPage(data.totalPages);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Katılımcılar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [tourId]);

  useEffect(() => { void loadPage(page); }, [loadPage, page]);

  function startAdd() {
    setAdding(true);
    setEditingId(null);
    setDraft(emptyDraft);
    setError('');
    setMessage('');
  }

  function startEdit(participant: Participant) {
    setEditingId(participant.id);
    setAdding(false);
    setDraft({ fullName: participant.fullName, phone: participant.phone });
    setError('');
    setMessage('');
  }

  async function submitAdd() {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch(`/api/tours/${tourId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Katılımcı eklenemedi.');
      setAdding(false);
      setDraft(emptyDraft);
      if (data.alreadyLinked) setMessage('Bu katılımcı zaten bu turda kayıtlı.');
      else if (data.created) setMessage('Katılımcı oluşturuldu ve tura eklendi.');
      else setMessage('Kayıtlı katılımcı bu tura eklendi.');
      if (data.alreadyLinked) await loadPage(page);
      else {
        const nextPage = Math.max(1, Math.ceil((result.total + 1) / result.pageSize));
        setPage(nextPage);
        if (nextPage === page) await loadPage(nextPage);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Katılımcı eklenemedi.');
    } finally {
      setSaving(false);
    }
  }

  async function submitEdit() {
    if (!editingId) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch(`/api/tours/${tourId}/participants/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Katılımcı güncellenemedi.');
      setEditingId(null);
      setDraft(emptyDraft);
      setMessage('Katılımcı bilgileri kaydedildi.');
      await loadPage(page);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Katılımcı güncellenemedi.');
    } finally {
      setSaving(false);
    }
  }

  const firstItem = result.total ? (result.page - 1) * result.pageSize + 1 : 0;
  const lastItem = Math.min(result.page * result.pageSize, result.total);

  return <section className="tour-participants-card" aria-labelledby="tour-participants-title">
    <div className="tour-participants-heading">
      <div><h2 id="tour-participants-title">Katılımcılar</h2><span>{result.total} kişi</span></div>
      <button className="add-user-button" type="button" onClick={adding ? () => setAdding(false) : startAdd}>
        <span aria-hidden="true">{adding ? '×' : '+'}</span>{adding ? 'Vazgeç' : 'Yeni Katılımcı'}
      </button>
    </div>

    {adding && <div className="tour-participant-editor" aria-label="Yeni katılımcı">
      <ParticipantFields draft={draft} setDraft={setDraft} disabled={saving} idPrefix="new-participant" />
      <div className="tour-participant-editor-actions">
        <button className="cancel-button" type="button" disabled={saving} onClick={() => setAdding(false)}>İptal</button>
        <button className="save-button" type="button" disabled={saving} onClick={submitAdd}>{saving ? 'Ekleniyor…' : 'Tura Ekle'}</button>
      </div>
    </div>}

    {error && <p className="form-error tour-participant-feedback" role="alert">{error}</p>}
    {message && <p className="profile-success tour-participant-feedback" role="status">{message}</p>}

    <div className="users-table-wrap">
      <table className="users-table tour-participants-table">
        <thead><tr><th>AD SOYAD</th><th>TELEFON NUMARASI</th><th><span className="visually-hidden">İşlem</span></th></tr></thead>
        <tbody>
          {loading ? <tr><td colSpan={3} className="tour-participants-empty">Katılımcılar yükleniyor…</td></tr>
            : result.participants.length === 0 ? <tr><td colSpan={3} className="tour-participants-empty">Bu tura henüz katılımcı eklenmedi.</td></tr>
              : result.participants.map((participant) => <tr key={participant.id}>
                {editingId === participant.id ? <>
                  <td colSpan={2}><ParticipantFields draft={draft} setDraft={setDraft} disabled={saving} idPrefix={`participant-${participant.id}`} /></td>
                  <td className="tour-participant-row-actions">
                    <button className="tour-participant-icon-button" type="button" disabled={saving} onClick={submitEdit}>Kaydet</button>
                    <button className="tour-participant-icon-button subtle" type="button" disabled={saving} onClick={() => setEditingId(null)}>İptal</button>
                  </td>
                </> : <>
                  <td>{participant.fullName}</td><td>{participant.phone}</td>
                  <td className="tour-participant-row-actions"><button className="tour-participant-icon-button" type="button" aria-label={`${participant.fullName} katılımcısını düzenle`} onClick={() => startEdit(participant)}>Düzenle</button></td>
                </>}
              </tr>)}
        </tbody>
      </table>
    </div>

    <div className="list-pagination tour-participants-pagination">
      <span>{firstItem}–{lastItem} / {result.total}</span>
      <div className="list-pagination-links">
        <button type="button" className={page <= 1 ? 'disabled' : ''} disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))} aria-label="Önceki sayfa">‹</button>
        <span className="tour-participants-page">{result.page} / {result.totalPages}</span>
        <button type="button" className={page >= result.totalPages ? 'disabled' : ''} disabled={page >= result.totalPages || loading} onClick={() => setPage((current) => Math.min(result.totalPages, current + 1))} aria-label="Sonraki sayfa">›</button>
      </div>
    </div>
  </section>;
}

function ParticipantFields({ draft, setDraft, disabled, idPrefix }: {
  draft: Draft;
  setDraft: (draft: Draft) => void;
  disabled: boolean;
  idPrefix: string;
}) {
  return <div className="tour-participant-fields">
    <div className="field"><label htmlFor={`${idPrefix}-name`}>Ad Soyad</label><input id={`${idPrefix}-name`} value={draft.fullName} onChange={(event) => setDraft({ ...draft, fullName: event.target.value })} maxLength={160} autoComplete="name" disabled={disabled} required /></div>
    <div className="field"><label htmlFor={`${idPrefix}-phone`}>Telefon numarası</label><input id={`${idPrefix}-phone`} type="tel" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} maxLength={32} autoComplete="tel" inputMode="tel" disabled={disabled} required /></div>
  </div>;
}
