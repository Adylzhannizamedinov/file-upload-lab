import { useEffect, useState } from 'react';
import { API } from './config.js';

export default function Gallery({ refreshKey }) {
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');

  const load = () =>
    fetch(`${API}/api/files`)
      .then((r) => r.json())
      .then((data) => {
        setFiles(data);
        setError('');
      })
      .catch(() => setError('Не удалось загрузить список. Сервер запущен?'));

  useEffect(() => {
    load();
  }, [refreshKey]);

  const remove = async (id) => {
    if (!confirm('Удалить фотографию?')) return;
    const res = await fetch(`${API}/api/files/${id}`, { method: 'DELETE' });
    if (res.ok) setFiles((prev) => prev.filter((f) => f.id !== id));
    else setError('Не удалось удалить файл');
  };

  if (error) return <p className="error">{error}</p>;
  if (files.length === 0) return <p className="muted">Пока нет ни одной фотографии.</p>;

  return (
    <div className="gallery">
      {files.map((f) => (
        <figure key={f.id} className="card photo">
          <img src={API + f.url} alt={f.title || f.originalName} />
          <figcaption>
            <strong>{f.title || f.originalName}</strong>
            {f.place && <div className="muted">📍 {f.place}</div>}
            <div className="muted small">
              {(f.size / 1024).toFixed(1)} КБ · {new Date(f.uploadedAt).toLocaleDateString('ru-RU')}
            </div>
            <button className="danger" onClick={() => remove(f.id)}>
              Удалить
            </button>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
