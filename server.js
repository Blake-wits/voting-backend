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
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)) //Appending extension
  }
})

const upload = multer({ storage: storage });

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

// 創建新投票
app.post('/api/votes', (req, res) => {
  const newVote = {
    id: Date.now(),
    title: req.body.title,
    pdfFilename: req.body.pdfFilename,
    objFilename: req.body.objFilename,
    glbFilename: req.body.glbFilename, // 新增 GLB 文件名
    options: req.body.options.map((option, index) => ({
      id: index + 1,
      text: option.text,
      reason: option.reason,
      votes: 0
    })),
    totalVotes: 0
  };
  votes.push(newVote);
  res.status(201).json(newVote);
});

// 獲取特定投票的詳細信息
app.get('/api/votes/:id', (req, res) => {
  const vote = votes.find(v => v.id === parseInt(req.params.id));
  if (vote) {
    res.json(vote);
  } else {
    res.status(404).send('未找到投票');
  }
});

// 文件上傳 API (支持 PDF, OBJ 和 GLB)
app.post('/api/upload-files', upload.fields([
  { name: 'pdf', maxCount: 1 },
  { name: 'model', maxCount: 1 }
]), (req, res) => {
  const response = {};

  if (req.files['pdf']) {
    response.pdfFilename = req.files['pdf'][0].filename;
  }

  if (req.files['model']) {
    const modelFile = req.files['model'][0];
    const ext = path.extname(modelFile.originalname).toLowerCase();
    if (ext === '.obj') {
      response.objFilename = modelFile.filename;
    } else if (ext === '.glb') {
      response.glbFilename = modelFile.filename;
    }
  }

  if (Object.keys(response).length === 0) {
    return res.status(400).send('沒有上傳文件。');
  }

  res.json(response);
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

// 獲取 OBJ API
app.get('/api/obj/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'uploads', filename);

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('未找到 OBJ 文件');
  }
});

// 獲得 GLB API
app.get('/api/glb/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'uploads', filename);

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('未找到 GLB 文件');
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
    const results = {
      id: vote.id,
      title: vote.title,
      totalVotes: vote.totalVotes,
      options: vote.options.map(option => ({
        id: option.id,
        text: option.text,
        votes: option.votes,
        percentage: vote.totalVotes > 0 ? (option.votes / vote.totalVotes * 100).toFixed(2) : '0.00',
        reason: option.reason
      }))
    };
    res.json(results);
  } else {
    res.status(404).send('未找到投票');
  }
});

// 獲取用戶投票記錄
app.get('/api/user-votes/:userId', (req, res) => {
  const userId = req.params.userId;
  const userVoteIds = userVotes[userId] || [];
  res.json(userVoteIds);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服務器運行在端口 ${PORT}`);
});

