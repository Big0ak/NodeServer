const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();
const port = 3000;

// Папка для хранения загруженных файлов
const uploadDir = path.join(__dirname, 'uploads');

// Создаем папку, если она не существует
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Конфигурация для multer (для загрузки файлов)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });

app.use(cors());

// Обработчик для загрузки видео
app.post('/upload', upload.single('video'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded');
  }
  res.status(200).send({ message: 'Upload successful', file: req.file });
});

// Обработчик для получения статуса загрузки (для возобновления)
app.get('/upload-status', (req, res) => {
  const filePath = path.join(uploadDir, req.query.filename);
  if (fs.existsSync(filePath)) {
    const fileStats = fs.statSync(filePath);
    return res.json({ uploaded: fileStats.size });
  }
  return res.status(404).send('File not found');
});

// Обработчик для возобновления загрузки с поддержкой диапазонов
app.get('/upload-resume', (req, res) => {
  const filePath = path.join(uploadDir, req.query.filename);
  const range = req.headers.range;

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  const fileSize = fs.statSync(filePath).size;
  const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB (размер чанка)
  const start = parseInt(range.replace(/bytes=/, '').split('-')[0]);
  const end = Math.min(start + CHUNK_SIZE - 1, fileSize - 1);

  const stream = fs.createReadStream(filePath, { start, end });
  const chunkSize = end - start + 1;

  res.writeHead(206, {
    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
    'Accept-Ranges': 'bytes',
    'Content-Length': chunkSize,
    'Content-Type': 'video/mp4',
  });

  stream.pipe(res);
});

// Запуск сервера
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
