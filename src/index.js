import express from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import dayjs from 'dayjs';
import Joi from 'joi';
dotenv.config();
dayjs().format();

const participantSchema = Joi.object({
  name: Joi.string().required(),
});

const messageTypes = ['private_message', 'message'];
const messageSchema = Joi.object({
  from: Joi.string().required(),
  to: Joi.string().required(),
  text: Joi.string().required(),
  type: Joi.alternatives().try(...messageTypes),
});

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
    const participantBody = req.body;

    const { error } = participantSchema.validate(participantBody);
    if (error) {
      console.log(error);
      res.sendStatus(422);
      return;
    }

    const userFind = await participants.findOne({ name: participantBody.name });
    if (userFind) {
      res.sendStatus(409);
      return;
    }

    const time = Date.now();
    const participant = { name: participantBody.name, lastStatus: time };
    const message = {
      from: participantBody.name,
      to: 'Todos',
      text: 'entra na sala...',
      type: 'status',
      time: dayjs(time).format('HH:mm:ss'),
    };
    await participants.insertOne(participant);
    await messages.insertOne(message);
    res.sendStatus(201);
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

app.post('/messages', async (req, res) => {
  try {
    const { user } = req.headers;
    const messageBody = req.body;

    const userFind = await participants.findOne({ name: user });
    const message = { from: userFind?.name, ...messageBody };

    const { error } = messageSchema.validate(message);
    if (error) {
      console.log(error);
      res.sendStatus(422);
      return;
    }

    await messages.insertOne({
      ...message,
      time: dayjs().format('HH:mm:ss'),
    });
    res.sendStatus(201);
  } catch (error) {
    console.log(error);
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

app.delete('/messages/:id', async (req, res) => {
  try {
    const { user } = req.headers;
    const { id } = req.params;

    const messageFind = await messages.findOne({ _id: new ObjectId(id) });
    console.log(messageFind);
    if (!messageFind) {
      return res.sendStatus(404);
    }

    if (messageFind.from !== user) {
      return res.sendStatus(401);
    }

    await messages.deleteOne({ _id: new ObjectId(id) });
    res.sendStatus(200);
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

const intervalId = setInterval(async () => {
  try {
    const usersList = await participants.find().toArray();
    const inactiveUsers = [];
    const now = Date.now();
    usersList.forEach((user) => {
      if (now - user.lastStatus > 10000) {
        inactiveUsers.push(user._id);
      }
    });
    await participants.deleteMany({ _id: { $in: inactiveUsers } });
  } catch (err) {
    console.log(err);
  }
}, 15000);

app.listen(process.env.API_PORT, () => {
  console.log(`Server listening on PORT ${process.env.PORT}`);
});

startMongoDB();
