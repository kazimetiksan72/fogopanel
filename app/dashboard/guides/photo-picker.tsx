'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { useDropzone } from 'react-dropzone';

export type PhotoSelection = { file: File; area: Area | null };
type Props = { onChange: (selection: PhotoSelection | null) => void; disabled: boolean };

export default function PhotoPicker({ onChange, disabled }: Props) {
  const [source, setSource] = useState('');
  const fileRef = useRef<File | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => () => { if (source) URL.revokeObjectURL(source); }, [source]);

  const onDrop = useCallback((files: File[]) => {
    const file = files[0];
    if (!file) return;
    fileRef.current = file;
    setSource(URL.createObjectURL(file));
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setError('');
    onChange({ file, area: null });
  }, [onChange]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    onDropRejected: () => setError('JPG, PNG veya WebP biçiminde, en fazla 10 MB fotoğraf seçin.'),
    accept: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    multiple: false,
    disabled,
  });

  function cancel() {
    fileRef.current = null;
    setSource('');
    setError('');
    onChange(null);
  }

  return <div className="guide-photo-field">
    {!source && <div {...getRootProps({ className: `guide-dropzone${isDragActive ? ' drag-active' : ''}${isDragReject ? ' drag-reject' : ''}`, role: 'button', 'aria-label': 'Rehber fotoğrafı seç veya sürükle bırak' })}>
      <input {...getInputProps({ 'aria-label': 'Rehber fotoğrafı' })} />
      <div className="guide-dropzone-content">
          <span className="guide-upload-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4m0 0L8 8m4-4 4 4"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg></span>
          <strong>{isDragActive ? 'Fotoğrafı buraya bırakın' : 'Fotoğrafı sürükleyin veya seçin'}</strong>
          <span>JPG, PNG veya WebP · En fazla 10 MB</span>
      </div>
    </div>}

    {source && <div className="guide-crop-editor">
      <div className="guide-crop-stage"><Cropper image={source} crop={crop} zoom={zoom} aspect={1} cropShape="round" showGrid={false} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, pixels) => { if (fileRef.current) onChange({ file: fileRef.current, area: pixels }); }} /></div>
      <label className="guide-zoom-label" htmlFor="guidePhotoZoom">Yakınlaştır <input id="guidePhotoZoom" type="range" min="1" max="3" step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} disabled={disabled} /></label>
      <div className="guide-crop-actions"><button type="button" className="cancel-button" onClick={cancel} disabled={disabled}>Vazgeç</button></div>
    </div>}
    {error && <p className="password-match-error" role="alert">{error}</p>}
  </div>;
}
