'use client';

import { FormEvent, KeyboardEvent, useMemo, useState } from 'react';
import { closestCenter, DndContext, KeyboardSensor, MeasuringStrategy, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useRouter } from 'next/navigation';
import AgencyCombobox from '../../agency-combobox';
import SortableVisitRow from './sortable-visit-row';

type AgencyOption = { id: string; name: string };
type TourFields = { name: string; agencyId: string; startDate: string; endDate: string; type: 'corporate' | 'individual' };
type Visit = { key: string; placeId: string; startTime: string };
type DayPlan = { date: string; visits: Visit[] };
type SavedDayPlan = { date: string; visits: { placeId: string; startTime: string }[] };

const DAY_MS = 24 * 60 * 60 * 1000;
const dateFormatter = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

function getTourDays(startDate: string, endDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) return [];
  const start = Date.parse(`${startDate}T00:00:00.000Z`);
  const end = Date.parse(`${endDate}T00:00:00.000Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return [];
  return Array.from({ length: Math.floor((end - start) / DAY_MS) + 1 }, (_, index) => new Date(start + index * DAY_MS));
}

export default function TourEditForm({ id, initial, agencies, lockedAgencyId, initialDayPlans }: {
  id: string;
  initial: TourFields;
  agencies: AgencyOption[];
  lockedAgencyId?: string;
  initialDayPlans: SavedDayPlan[];
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [selectedDay, setSelectedDay] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dayPlans, setDayPlans] = useState<DayPlan[]>(() => initialDayPlans.map((plan) => ({
    date: plan.date,
    visits: plan.visits.map((visit, index) => ({ ...visit, key: `${plan.date}-${index}` })),
  })));
  const days = useMemo(() => getTourDays(form.startDate, form.endDate), [form.startDate, form.endDate]);
  const activeDay = Math.min(selectedDay, Math.max(days.length - 1, 0));
  const activeDate = days[activeDay]?.toISOString().slice(0, 10);
  const activeVisits = dayPlans.find((plan) => plan.date === activeDate)?.visits || [];
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function update<K extends keyof TourFields>(key: K, value: TourFields[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  function updateVisits(date: string, change: (visits: Visit[]) => Visit[]) {
    setDayPlans((current) => {
      const existing = current.find((plan) => plan.date === date);
      const updated = change(existing?.visits || []);
      return [...current.filter((plan) => plan.date !== date), { date, visits: updated }];
    });
    setSaved(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const visibleDates = new Set(days.map((day) => day.toISOString().slice(0, 10)));
    const plansToSave = dayPlans.filter((plan) => visibleDates.has(plan.date) && plan.visits.length)
      .map((plan) => ({ date: plan.date, visits: plan.visits.map(({ placeId, startTime }) => ({ placeId, startTime })) }));
    const invalidPlan = plansToSave.find((plan) => plan.visits.some((visit) => !visit.placeId || !visit.startTime));
    if (invalidPlan) {
      setSelectedDay(days.findIndex((day) => day.toISOString().slice(0, 10) === invalidPlan.date));
      setError('Her gezilecek yer için Google Maps sonucundan bir yer seçin ve başlangıç saati girin.');
      return;
    }
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const response = await fetch(`/api/tours/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, dayPlans: plansToSave }),
      });
      const data = await response.json();
      if (!response.ok) { setError(data.error || 'Tur güncellenemedi.'); return; }
      setDayPlans((current) => current.filter((plan) => visibleDates.has(plan.date)));
      setSaved(true);
      router.refresh();
    } catch { setError('Bağlantı kurulamadı. Lütfen tekrar deneyin.'); }
    finally { setSaving(false); }
  }

  function moveTab(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === 'ArrowRight' ? Math.min(index + 1, days.length - 1)
      : event.key === 'ArrowLeft' ? Math.max(index - 1, 0)
        : event.key === 'Home' ? 0
          : event.key === 'End' ? days.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    setSelectedDay(next);
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  }

  return <form className="tour-edit-form" onSubmit={submit}>
    <div className="tour-edit-card">
      <div className="tour-edit-card-heading"><h2>Tur Bilgileri</h2></div>
      <div className="tour-edit-fields user-form">
        <div className="field"><label htmlFor="editTourName">Tur Adı</label><input id="editTourName" value={form.name} onChange={(event) => update('name', event.target.value)} maxLength={120} required /></div>
        <div className="field"><label htmlFor="tourAgency">Acente {!lockedAgencyId && <span className="optional-label">(isteğe bağlı)</span>}</label><AgencyCombobox agencies={agencies} value={form.agencyId} onChange={(agencyId) => update('agencyId', agencyId)} disabled={Boolean(lockedAgencyId)} /></div>
        <div className="form-row">
          <div className="field"><label htmlFor="editTourStartDate">Başlama Tarihi</label><input id="editTourStartDate" type="date" value={form.startDate} onChange={(event) => update('startDate', event.target.value)} required /></div>
          <div className="field"><label htmlFor="editTourEndDate">Bitiş Tarihi</label><input id="editTourEndDate" type="date" min={form.startDate || undefined} value={form.endDate} onChange={(event) => update('endDate', event.target.value)} required /></div>
        </div>
        <div className="field"><label htmlFor="editTourType">Tur Tipi</label><select id="editTourType" value={form.type} onChange={(event) => update('type', event.target.value as TourFields['type'])} required><option value="corporate">Kurumsal</option><option value="individual">Bireysel</option></select></div>
      </div>
    </div>
    <section className="tour-days-card" aria-label="Tur günleri">
      <div className="tour-days-heading"><h2>Tur Günleri</h2><span>{days.length} gün</span></div>
      {days.length ? <>
        <div className="tour-day-tabs" role="tablist" aria-label="Tur günleri">
          {days.map((day, index) => <button
            key={day.toISOString()}
            id={`tour-day-tab-${index}`}
            type="button"
            role="tab"
            aria-selected={activeDay === index}
            aria-controls="tour-day-panel"
            tabIndex={activeDay === index ? 0 : -1}
            className={`tour-day-tab${activeDay === index ? ' active' : ''}`}
            onClick={() => setSelectedDay(index)}
            onKeyDown={(event) => moveTab(event, index)}
          ><strong>{index + 1}. Gün</strong><span>{dateFormatter.format(day)}</span></button>)}
        </div>
        <div id="tour-day-panel" className="tour-day-panel" role="tabpanel" aria-labelledby={`tour-day-tab-${activeDay}`} tabIndex={0}>
          <span className="tour-day-panel-count">{activeDay + 1}. GÜN / {days.length} GÜN</span>
          <h3>{dateFormatter.format(days[activeDay])}</h3>
          <div className="tour-visits-heading"><h4>Gezilecek Yerler</h4><button type="button" className="cancel-button" onClick={() => updateVisits(activeDate!, (visits) => [...visits, { key: crypto.randomUUID(), placeId: '', startTime: '' }])}>＋ Yer Ekle</button></div>
          {activeVisits.length ? <DndContext sensors={sensors} collisionDetection={closestCenter} measuring={{ droppable: { strategy: MeasuringStrategy.Always } }} onDragStart={() => setDragging(true)} onDragCancel={() => setDragging(false)} onDragEnd={({ active, over }) => {
            setDragging(false);
            if (!activeDate || !over || active.id === over.id) return;
            updateVisits(activeDate, (visits) => {
              const from = visits.findIndex((visit) => visit.key === active.id);
              const to = visits.findIndex((visit) => visit.key === over.id);
              return from < 0 || to < 0 ? visits : arrayMove(visits, from, to);
            });
          }}>
            <SortableContext items={activeVisits.map((visit) => visit.key)} strategy={verticalListSortingStrategy}>
              <div className={`tour-visits-list${dragging ? ' is-dragging' : ''}`}>{activeVisits.map((visit, index) => <SortableVisitRow
                key={visit.key}
                visit={visit}
                index={index}
                onPlaceChange={(placeId) => updateVisits(activeDate!, (visits) => visits.map((item) => item.key === visit.key ? { ...item, placeId } : item))}
                onTimeChange={(startTime) => updateVisits(activeDate!, (visits) => visits.map((item) => item.key === visit.key ? { ...item, startTime } : item))}
                onRemove={() => updateVisits(activeDate!, (visits) => visits.filter((item) => item.key !== visit.key))}
              />)}</div>
            </SortableContext>
          </DndContext> : <p className="tour-visits-empty">Bu güne henüz gezilecek yer eklenmedi.</p>}
        </div>
      </> : <p className="tour-days-empty">Günleri görmek için geçerli bir başlangıç ve bitiş tarihi seçin.</p>}
    </section>
    {error && <p className="form-error tour-edit-feedback" role="alert">{error}</p>}
    {saved && <p className="profile-success tour-edit-feedback" role="status">Tur bilgileri kaydedildi.</p>}
    <div className="tour-edit-actions"><button className="save-button" type="submit" disabled={saving}>{saving ? 'Kaydediliyor…' : 'Kaydet'}</button></div>
  </form>;
}
