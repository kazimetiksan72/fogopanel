'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { PlacePhoto } from './place-photo-carousel';

export default function PlacePhotoStrip({ photos, placeName }: { photos: PlacePhoto[]; placeName: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [imageError, setImageError] = useState(false);
  const [failedThumbs, setFailedThumbs] = useState<string[]>([]);
  const photoButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const visiblePhotos = photos.slice(0, 5);
  const selectedPhoto = openIndex === null ? null : visiblePhotos[openIndex];

  useEffect(() => {
    if (openIndex === null) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openIndex]);

  function close() {
    const index = openIndex;
    setOpenIndex(null);
    if (index !== null) photoButtons.current[index]?.focus();
  }

  if (!visiblePhotos.length) return null;

  return <>
    <div className="tour-visit-photos" aria-label={`${placeName} fotoğrafları`}>
      {visiblePhotos.map((photo, index) => <button
        key={photo.name}
        ref={(node) => { photoButtons.current[index] = node; }}
        type="button"
        className="tour-visit-photo"
        aria-label={`${placeName} fotoğrafı ${index + 1}, büyüt`}
        onClick={() => { setImageError(false); setOpenIndex(index); }}
      >{failedThumbs.includes(photo.name)
        ? <span>Fotoğraf açılamadı</span>
        : <img src={`/api/places/photo?name=${encodeURIComponent(photo.name)}&size=thumb`} alt="" width="96" height="76" loading="lazy" onError={() => setFailedThumbs((current) => [...current, photo.name])} />}</button>)}
    </div>
    <span className="tour-visit-photo-credit" translate="no">Google Maps</span>
    {selectedPhoto && createPortal(<div className="modal-backdrop place-photo-lightbox-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div className="place-photo-lightbox" role="dialog" aria-modal="true" aria-label={`${placeName} fotoğrafı ${openIndex! + 1}`}>
        <button className="modal-close place-photo-lightbox-close" type="button" aria-label="Fotoğrafı kapat" onClick={close} autoFocus>×</button>
        {imageError
          ? <div className="place-photo-lightbox-error">Fotoğraf yüklenemedi.</div>
          : <img src={`/api/places/photo?name=${encodeURIComponent(selectedPhoto.name)}&size=large`} alt={`${placeName} fotoğrafı ${openIndex! + 1}`} onError={() => setImageError(true)} />}
        <div className="place-photo-lightbox-footer">
          <div className="place-photo-authors">{selectedPhoto.authors.map((author, authorIndex) => <span key={`${author.name}-${authorIndex}`} className="place-photo-author">
            {author.photoUri && <img src={author.photoUri} alt="" width="24" height="24" />}
            {author.uri ? <a href={author.uri} target="_blank" rel="noopener noreferrer">{author.name}</a> : <span>{author.name}</span>}
          </span>)}</div>
          <a className="place-photo-source" href={selectedPhoto.googleMapsUri} target="_blank" rel="noopener noreferrer">Google Maps’te görüntüle</a>
        </div>
      </div>
    </div>, document.body)}
  </>;
}
