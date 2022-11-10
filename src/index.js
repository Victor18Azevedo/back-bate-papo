import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import dayjs from 'dayjs';
import Joi from 'joi';
dotenv.config();
dayjs().format();

const messageTypes = ['private_message', 'message'];

const app = express();
app.use(cors());
app.use(express.json());

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;
let participants;
let messages;

async function startMongoDB() {
  try {
    await mongoClient.connect();
    db = mongoClient.db('batePapoUol');
    participants = db.collection('participants');
    messages = db.collection('messages');
    console.log('Connected successfully to data server');
  } catch {
    console.error('ERROR: Not connected to data server');
  }
}

app.post('/participants', async (req, res) => {
  try {
    const schema = Joi.object({
      name: Joi.string().required(),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      console.log(error);
      res.sendStatus(422);
      return;
    }

    const { name } = req.body;

    const user = await participants.findOne({ name });
    if (user) {
      res.sendStatus(409);
      return;
    }
    const time = Date.now();
    const participant = { name, lastStatus: time };
    const message = {
      from: name,
      to: 'Todos',
      text: 'entra na sala...',
      type: 'status',
      time: dayjs(time).format('HH:mm:ss'),
    };
    await participants.insertOne(participant);
    await messages.insertOne(message);
    res.sendStatus(201);
  } catch {
    res.sendStatus(500);
  }
});

app.post('/messages', async (req, res) => {
  try {
    const { user } = req.headers;
    const userFind = await participants.findOne({ name: user });

    const { to, text, type } = req.body;
    const message = { from: userFind?.name, to, text, type };

    const schema = Joi.object({
      from: Joi.string().required(),
      to: Joi.string().required(),
      text: Joi.string().required(),
      type: Joi.alternatives().try(...messageTypes),
    });

    const { error } = schema.validate(message);
    if (error) {
      console.log(error);
      res.sendStatus(422);
      return;
    }
    await messages.insertOne({
      ...message,
      time: dayjs(Date.now()).format('HH:mm:ss'),
    });
    res.sendStatus(201);
  } catch {
    res.sendStatus(500);
  }
});

app.post('/status', (req, res) => {
  const { user } = req.header;

  res.sendStatus(200);
});

app.get('/participants', async (req, res) => {
  try {
    const participanList = await participants.find().toArray();
    res.send(participanList);
  } catch {
    res.sendStatus(500);
  }
});

app.get('/messages', (req, res) => {
  const { user } = req.headers;
  const { limit } = req.query;

  const messagesList = [];

  res.send(messagesList);
});

app.listen(process.env.PORT, () => {
  console.log(`Server listening on PORT ${process.env.PORT}`);
});

startMongoDB();
