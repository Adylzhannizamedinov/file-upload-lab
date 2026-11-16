import { useState } from 'react';
import UploadForm from './UploadForm.jsx';
import Gallery from './Gallery.jsx';

export default function App() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="container">
      <h1>📷 Фотогалерея путешествий</h1>
      <UploadForm onUploaded={() => setRefreshKey((k) => k + 1)} />
      <h2>Мои фотографии</h2>
      <Gallery refreshKey={refreshKey} />
    </div>
  );
}
