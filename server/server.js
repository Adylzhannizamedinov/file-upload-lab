const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;
const MAX_SIZE = 2 * 1024 * 1024; // 2 МБ
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const DB = path.join(__dirname, 'files.json');

app.use(cors());
app.use(express.json());
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Раздача загруженных файлов браузеру
app.use('/uploads', express.static(UPLOAD_DIR));

// ---------- «База данных» в JSON-файле ----------
const readDB = () => (fs.existsSync(DB) ? JSON.parse(fs.readFileSync(DB, 'utf8')) : []);
const writeDB = (data) => fs.writeFileSync(DB, JSON.stringify(data, null, 2));

// ---------- Multer ----------
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  // уникальное имя: не доверяем имени от пользователя
  filename: (req, file, cb) =>
    cb(
      null,
      Date.now() + '-' + Math.round(Math.random() * 1e6) + path.extname(file.originalname).toLowerCase()
    ),
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => {
    const ok = ALLOWED.includes(file.mimetype);
    cb(ok ? null : new Error('Недопустимый тип файла (разрешены JPG, PNG, WEBP)'), ok);
  },
});

// Multer читает имя файла как latin1 — возвращаем нормальный UTF-8 (русские названия)
const fixName = (name) => Buffer.from(name, 'latin1').toString('utf8');

// ---------- Маршруты ----------

// Список файлов
app.get('/api/files', (req, res) => {
  res.json(readDB());
});

// Загрузка (до 5 файлов за раз) + дополнительные поля title и place
app.post('/api/upload', upload.array('files', 5), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'Файл не получен' });
  }

  const title = (req.body.title || '').trim().slice(0, 100);
  const place = (req.body.place || '').trim().slice(0, 100);

  const db = readDB();
  const created = req.files.map((f, i) => ({
    id: Date.now() + i,
    filename: f.filename,
    originalName: fixName(f.originalname),
    size: f.size,
    url: '/uploads/' + f.filename,
    title,
    place,
    uploadedAt: new Date().toISOString(),
  }));

  writeDB([...db, ...created]);
  res.json(created);
});

// Удаление
app.delete('/api/files/:id', (req, res) => {
  const id = Number(req.params.id);
  const db = readDB();
  const item = db.find((f) => f.id === id);
  if (!item) return res.status(404).json({ error: 'Файл не найден' });

  // path.basename защищает от выхода из папки uploads
  const filePath = path.join(UPLOAD_DIR, path.basename(item.filename));
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  writeDB(db.filter((f) => f.id !== id));
  res.json({ ok: true });
});

// ---------- Обработчик ошибок (в самом конце) ----------
app.use((err, req, res, next) => {
  let message = err.message;
  if (err.code === 'LIMIT_FILE_SIZE') message = 'Файл слишком большой (максимум 2 МБ)';
  if (err.code === 'LIMIT_UNEXPECTED_FILE') message = 'Слишком много файлов (максимум 5)';
  res.status(400).json({ error: message });
});

app.listen(PORT, () => console.log('Сервер: http://localhost:' + PORT));
