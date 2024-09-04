const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});