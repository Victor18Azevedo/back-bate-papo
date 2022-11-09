import express from 'express';
import cors from 'cors';

const PORT = 5000;

const app = express();
app.use(cors());
app.use(express.json());

app.post('/participants', (req, res) => {
  const { name } = req.body;

  res.sendStatus(201);
});

app.post('/messages', (req, res) => {
  const { user } = req.header;
  const { to, text, type } = req.body;

  res.sendStatus(201);
});

app.post('/status', (req, res) => {
  const { user } = req.header;

  res.sendStatus(200);
});

app.get('/participants', (req, res) => {
  const participantsList = [];

  res.send(participantsList);
});

app.get('/messages', (req, res) => {
  const { user } = req.header;
  const { limit } = req.query;

  const messagesList = [];

  res.send(messagesList);
});

app.listen(PORT, () => {
  console.log(`Server listening on PORT ${PORT}`);
});
