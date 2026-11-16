import { useEffect, useState } from 'react';
import { API, MAX_SIZE, ALLOWED_TYPES } from './config.js';

const toKB = (bytes) => (bytes / 1024).toFixed(1) + ' КБ';

export default function UploadForm({ onUploaded }) {
  const [items, setItems] = useState([]); // [{ file, preview }]
  const [title, setTitle] = useState('');
  const [place, setPlace] = useState('');
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const error = (text) => setMessage({ text, type: 'error' });
  const success = (text) => setMessage({ text, type: 'success' });

  // освобождаем память от предпросмотров
  useEffect(() => {
    return () => items.forEach((i) => URL.revokeObjectURL(i.preview));
  }, [items]);

  const onChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    if (files.length > 5) return error('Можно выбрать не более 5 файлов');

    for (const f of files) {
      if (!ALLOWED_TYPES.includes(f.type)) {
        e.target.value = '';
        return error(`«${f.name}»: только JPG, PNG или WEBP`);
      }
      if (f.size > MAX_SIZE) {
        e.target.value = '';
        return error(`«${f.name}»: максимум 2 МБ`);
      }
    }

    setItems(files.map((file) => ({ file, preview: URL.createObjectURL(file) })));
    setMessage({ text: '', type: '' });
    setProgress(0);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (items.length === 0) return error('Сначала выберите файл');

    const fd = new FormData();
    fd.append('title', title);
    fd.append('place', place);
    items.forEach((i) => fd.append('files', i.file));

    // XMLHttpRequest, потому что fetch не показывает прогресс отправки
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API}/api/upload`);

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100));
    };

    xhr.onload = () => {
      setUploading(false);
      let data = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* ответ не JSON */
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        success(`Загружено файлов: ${data.length}`);
        setItems([]);
        setTitle('');
        setPlace('');
        document.getElementById('file-input').value = '';
        onUploaded();
      } else {
        error(data.error || 'Ошибка загрузки');
      }
    };

    xhr.onerror = () => {
      setUploading(false);
      error('Не удалось связаться с сервером');
    };

    setUploading(true);
    setProgress(0);
    xhr.send(fd); // Content-Type не задаём — браузер добавит boundary сам
  };

  return (
    <form className="card" onSubmit={onSubmit}>
      <h2>Загрузка</h2>

      <label>
        Подпись
        <input
          type="text"
          value={title}
          maxLength={100}
          placeholder="Например: Закат на пляже"
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>

      <label>
        Место
        <input
          type="text"
          value={place}
          maxLength={100}
          placeholder="Например: Алматы, Большое озеро"
          onChange={(e) => setPlace(e.target.value)}
        />
      </label>

      <label>
        Фотографии (до 5 шт., JPG/PNG/WEBP, до 2 МБ)
        <input id="file-input" type="file" accept="image/*" multiple onChange={onChange} />
      </label>

      {items.length > 0 && (
        <div className="previews">
          {items.map(({ file, preview }) => (
            <figure key={preview}>
              <img src={preview} alt="Предпросмотр" width="120" />
              <figcaption>
                {file.name}
                <br />
                {toKB(file.size)}
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {uploading && (
        <div className="progress-row">
          <progress value={progress} max="100" />
          <span>{progress}%</span>
        </div>
      )}

      <button type="submit" disabled={uploading}>
        {uploading ? 'Загрузка…' : 'Загрузить'}
      </button>

      {message.text && <p className={message.type}>{message.text}</p>}
    </form>
  );
}
