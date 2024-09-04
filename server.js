const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// 設置文件上傳
const upload = multer({ dest: 'uploads/' });

// 確保上傳目錄存在
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// 使用內存存儲作為臨時數據庫
let votes = [];

app.get('/api/votes', (req, res) => {
  res.json(votes);
});

app.post('/api/votes', (req, res) => {
  const newVote = req.body;
  votes.push(newVote);
  res.status(201).json(newVote);
});

app.get('/api/votes/:id', (req, res) => {
  const vote = votes.find(v => v.id === parseInt(req.params.id));
  if (vote) {
    res.json(vote);
  } else {
    res.status(404).send('Vote not found');
  }
});

// PDF 上傳 API
app.post('/api/upload-pdf', upload.single('pdf'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  res.json({ 
    filename: req.file.filename,
    path: req.file.path
  });
});

// 獲取 PDF API
app.get('/api/pdf/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'uploads', filename);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('PDF not found');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});