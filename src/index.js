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
  } catch (err) {
    console.log(err);
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
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.post('/status', async (req, res) => {
  try {
    const { user } = req.headers;
    const userFind = await participants.findOne({ name: user });
    if (!userFind) {
      res.sendStatus(404);
      return;
    }

    const participantQuery = { name: user };
    const participantReplace = { name: user, lastStatus: Date.now() };
    await participants.replaceOne(participantQuery, participantReplace);
    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.get('/participants', async (req, res) => {
  try {
    const participanList = await participants.find().toArray();
    res.send(participanList);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.get('/messages', async (req, res) => {
  try {
    const { user } = req.headers;
    const { limit } = req.query;

    const allMessages = await messages.find().toArray();

    const userMessages = allMessages.filter((message) => {
      return (
        message.type !== 'private_message' ||
        (message.type === 'private_message' &&
          (message.from === user || message.to === user))
      );
    });

    if (limit) {
      res.send(userMessages.slice(-limit));
      return;
    }
    res.send(userMessages);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Server listening on PORT ${process.env.PORT}`);
});

startMongoDB();
