import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

mongoClient
  .connect()
  .then(() => {
    db = mongoClient.db('batePapoUol');
    console.log('Connected successfully to data server');
  })
  .catch(() => console.error('ERROR: Not connected to data server'));

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

app.listen(process.env.PORT, () => {
  console.log(`Server listening on PORT ${process.env.PORT}`);
});
