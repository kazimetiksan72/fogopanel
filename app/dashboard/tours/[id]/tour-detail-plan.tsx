'use client';

import { useEffect, useState, type KeyboardEvent } from 'react';
import PlacePhotoStrip from './edit/place-photo-strip';
import type { PlacePhoto } from './edit/place-photo-carousel';

type Visit = { placeId: string; startTime: string };
type DayPlan = { date: string; visits: Visit[] };
type PlaceSummary = { name: string; address: string; phone: string; phoneUri: string; photos: PlacePhoto[] };

const DAY_MS = 24 * 60 * 60 * 1000;
const dateFormatter = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

function getTourDays(startDate: string, endDate: string) {
  const start = Date.parse(`${startDate}T00:00:00.000Z`);
  const end = Date.parse(`${endDate}T00:00:00.000Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return [];
  return Array.from({ length: Math.floor((end - start) / DAY_MS) + 1 }, (_, index) => new Date(start + index * DAY_MS));
}

function VisitDetail({ visit, index }: { visit: Visit; index: number }) {
  const [place, setPlace] = useState<PlaceSummary | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/places/${encodeURIComponent(visit.placeId)}?summary=1`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.name) throw new Error('Mekân bilgisi alınamadı.');
        setPlace({
          name: data.name,
          address: typeof data.address === 'string' ? data.address : '',
          phone: typeof data.phone === 'string' ? data.phone : '',
          phoneUri: typeof data.phoneUri === 'string' ? data.phoneUri : '',
          photos: Array.isArray(data.photos) ? data.photos : [],
        });
      })
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [visit.placeId]);

  const dialNumber = (place?.phoneUri || place?.phone || '').replace(/[^+\d]/g, '');
  const whatsappNumber = dialNumber.replace(/\D/g, '');

  return <article className="tour-detail-visit">
    <span className="tour-detail-visit-number">{index + 1}</span>
    <div className="tour-visit-summary">
      <div className="tour-visit-summary-heading"><strong>{place?.name || (error ? 'Mekân bilgisi alınamadı' : 'Mekân yükleniyor…')}</strong><span>Başlangıç: {visit.startTime}</span></div>
      {place && <PlacePhotoStrip photos={place.photos} placeName={place.name} />}
      {place && (place.address || place.phone) && <div className="tour-visit-contact">
        {place.address && <div className="tour-visit-contact-line"><span>Adres</span><p>{place.address}</p></div>}
        {place.phone && <div className="tour-visit-contact-line"><span>Telefon</span><p>{place.phone}</p></div>}
        {place.phone && dialNumber && <div className="tour-visit-contact-actions">
          <a href={`tel:${dialNumber}`}>Telefonla ara</a>
          {whatsappNumber && <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer">WhatsApp’tan yaz</a>}
        </div>}
      </div>}
    </div>
  </article>;
}

export default function TourDetailPlan({ startDate, endDate, dayPlans }: { startDate: string; endDate: string; dayPlans: DayPlan[] }) {
  const [selectedDay, setSelectedDay] = useState(0);
  const days = getTourDays(startDate, endDate);
  const activeDate = days[selectedDay]?.toISOString().slice(0, 10);
  const visits = dayPlans.find((plan) => plan.date === activeDate)?.visits || [];

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

  return <section className="tour-days-card" aria-label="Tur günleri">
    <div className="tour-days-heading"><h2>Tur Günleri</h2><span>{days.length} gün</span></div>
    {days.length ? <>
      <div className="tour-day-tabs" role="tablist" aria-label="Tur günleri">
        {days.map((day, index) => <button
          key={day.toISOString()}
          id={`tour-detail-tab-${index}`}
          type="button"
          role="tab"
          aria-selected={selectedDay === index}
          aria-controls="tour-detail-panel"
          tabIndex={selectedDay === index ? 0 : -1}
          className={`tour-day-tab${selectedDay === index ? ' active' : ''}`}
          onClick={() => setSelectedDay(index)}
          onKeyDown={(event) => moveTab(event, index)}
        ><strong>{index + 1}. Gün</strong><span>{dateFormatter.format(day)}</span></button>)}
      </div>
      <div id="tour-detail-panel" className="tour-day-panel" role="tabpanel" aria-labelledby={`tour-detail-tab-${selectedDay}`} tabIndex={0}>
        <span className="tour-day-panel-count">{selectedDay + 1}. GÜN / {days.length} GÜN</span>
        <h3>{dateFormatter.format(days[selectedDay])}</h3>
        <div className="tour-visits-heading"><h4>Gezilecek Yerler</h4></div>
        {visits.length ? <div className="tour-detail-visits">{visits.map((visit, index) => <VisitDetail key={`${activeDate}-${visit.placeId}-${index}`} visit={visit} index={index} />)}</div>
          : <p className="tour-visits-empty">Bu güne henüz gezilecek yer eklenmedi.</p>}
      </div>
    </> : <p className="tour-days-empty">Tur günleri bulunamadı.</p>}
  </section>;
}
