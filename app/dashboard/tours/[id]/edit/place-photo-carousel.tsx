'use client';

import { useEffect, useState } from 'react';

export type PlacePhoto = {
  name: string;
  googleMapsUri: string;
  authors: { name: string; uri: string; photoUri: string }[];
};

export default function PlacePhotoCarousel({ photos, placeName }: { photos: PlacePhoto[]; placeName: string }) {
  const [index, setIndex] = useState(0);
  const [imageError, setImageError] = useState(false);
  const visiblePhotos = photos.slice(0, 5);
  const photo = visiblePhotos[index];

  useEffect(() => { setImageError(false); }, [index]);

  if (!photo) return <p className="place-photos-empty">Bu mekâna ait fotoğraf bulunamadı.</p>;

  function move(step: number) {
    setIndex((current) => (current + step + visiblePhotos.length) % visiblePhotos.length);
  }

  return <div className="place-photo-carousel" role="region" aria-roledescription="karuzel" aria-label={`${placeName} fotoğrafları`}>
    <div className="place-photo-stage">
      {imageError
        ? <div className="place-photo-unavailable">Fotoğraf yüklenemedi.</div>
        : <img key={photo.name} src={`/api/places/photo?name=${encodeURIComponent(photo.name)}`} alt={`${placeName} fotoğrafı ${index + 1}`} onError={() => setImageError(true)} />}
      {visiblePhotos.length > 1 && <>
        <button className="place-photo-arrow previous" type="button" aria-label="Önceki fotoğraf" onClick={() => move(-1)}>‹</button>
        <button className="place-photo-arrow next" type="button" aria-label="Sonraki fotoğraf" onClick={() => move(1)}>›</button>
      </>}
      <span className="place-photo-count">{index + 1} / {visiblePhotos.length}</span>
    </div>
    <div className="place-photo-footer">
      <div className="place-photo-authors">
        {photo.authors.map((author, authorIndex) => <span key={`${author.name}-${authorIndex}`} className="place-photo-author">
          {author.photoUri && <img src={author.photoUri} alt="" width="24" height="24" />}
          {author.uri ? <a href={author.uri} target="_blank" rel="noopener noreferrer">{author.name}</a> : <span>{author.name}</span>}
        </span>)}
      </div>
      <a className="place-photo-source" href={photo.googleMapsUri} target="_blank" rel="noopener noreferrer">Google Maps’te görüntüle</a>
    </div>
    {visiblePhotos.length > 1 && <div className="place-photo-dots" aria-label="Fotoğraf seçimi">
      {visiblePhotos.map((item, dotIndex) => <button key={item.name} type="button" className={dotIndex === index ? 'active' : ''} aria-label={`${dotIndex + 1}. fotoğraf`} aria-current={dotIndex === index ? 'true' : undefined} onClick={() => setIndex(dotIndex)} />)}
    </div>}
  </div>;
}
