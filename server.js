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
let userVotes = {};

// 獲取所有投票的列表
app.get('/api/votes', (req, res) => {
  res.json(votes);
});

app.post('/api/votes', (req, res) => {
  const newVote = {
    id: Date.now(),
    title: req.body.title,
    pdfFilename: req.body.pdfFilename,
    options: req.body.options.map((option, index) => ({
      id: index + 1,
      text: option.text,
      votes: 0
    })),
    totalVotes: 0
  };
  votes.push(newVote);
  res.status(201).json(newVote);
});

app.get('/api/votes/:id', (req, res) => {
  const vote = votes.find(v => v.id === parseInt(req.params.id));
  if (vote) {
    res.json(vote);
  } else {
    res.status(404).send('未找到投票');
  }
});

// PDF 上傳 API
app.post('/api/upload-pdf', upload.single('pdf'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('沒有上傳文件。');
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
    res.status(404).send('未找到 PDF');
  }
});

// 投票 API
app.post('/api/cast-vote', (req, res) => {
  const { userId, voteId, optionId, reason } = req.body;
  const vote = votes.find(v => v.id === voteId);

  if (!vote) {
    return res.status(404).send('未找到投票');
  }

  if (userVotes[userId] && userVotes[userId].includes(voteId)) {
    return res.status(400).send('您已經對這個投票進行過投票');
  }

  const option = vote.options.find(o => o.id === optionId);
  if (!option) {
    return res.status(404).send('未找到選項');
  }

  option.votes += 1;
  vote.totalVotes += 1;

  if (!userVotes[userId]) {
    userVotes[userId] = [];
  }
  userVotes[userId].push(voteId);

  // 儲存投票理由
  if (!vote.reasons) {
    vote.reasons = [];
  }
  vote.reasons.push({ userId, optionId, reason });

  res.status(200).json({ message: '投票成功' });
});

// 獲取投票結果 API
app.get('/api/vote-results/:id', (req, res) => {
  const vote = votes.find(v => v.id === parseInt(req.params.id));
  if (vote) {
    const results = vote.options.map(option => ({
      id: option.id,
      text: option.text,
      votes: option.votes,
      percentage: (option.votes / vote.totalVotes * 100).toFixed(2)
    }));
    res.json({ title: vote.title, totalVotes: vote.totalVotes, results });
  } else {
    res.status(404).send('未找到投票');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服務器運行在端口 ${PORT}`);
});