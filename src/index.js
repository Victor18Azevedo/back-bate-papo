import express from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import dayjs from 'dayjs';
import Joi from 'joi';
dotenv.config();
dayjs().format();

const CUTOFF_TIME = 10000;
const REFRESH_TIME = 15000;

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
let participantsCollection;
let messagesCollection;

async function startMongoDB() {
  try {
    await mongoClient.connect();
    db = mongoClient.db('batePapoUol');
    participantsCollection = db.collection('participants');
    messagesCollection = db.collection('messages');
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

    const userFind = await participantsCollection.findOne({
      name: participantBody.name,
    });
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
    await participantsCollection.insertOne(participant);
    await messagesCollection.insertOne(message);
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

    const userFind = await participantsCollection.findOne({ name: user });
    const message = { from: userFind?.name, ...messageBody };

    const { error } = messageSchema.validate(message);
    if (error) {
      console.log(error);
      res.sendStatus(422);
      return;
    }

    await messagesCollection.insertOne({
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
    const userFind = await participantsCollection.findOne({ name: user });
    if (!userFind) {
      res.sendStatus(404);
      return;
    }

    const participantQuery = { name: user };
    const participantReplace = { name: user, lastStatus: Date.now() };
    await participantsCollection.replaceOne(
      participantQuery,
      participantReplace
    );
    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.get('/participants', async (req, res) => {
  try {
    const participanList = await participantsCollection.find().toArray();
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

    const allMessages = await messagesCollection.find().toArray();

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

    const messageFind = await messagesCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!messageFind) {
      return res.sendStatus(404);
    }

    if (messageFind.from !== user) {
      return res.sendStatus(401);
    }

    await messagesCollection.deleteOne({ _id: new ObjectId(id) });
    res.sendStatus(200);
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

setInterval(async () => {
  try {
    const cutoff = Date.now() - CUTOFF_TIME;
    const inactiveUsers = await participantsCollection
      .find({ lastStatus: { $lt: cutoff } })
      .toArray();

    if (inactiveUsers.length > 0) {
      const messagesLeave = inactiveUsers.map((user) => {
        return {
          from: user.name,
          to: 'Todos',
          text: 'sai da sala...',
          type: 'status',
          time: dayjs().format('HH:mm:ss'),
        };
      });
      await participantsCollection.deleteMany({
        _id: { $in: inactiveUsers.map((user) => user._id) },
      });
      await messagesCollection.insertMany(messagesLeave);
    }
  } catch (error) {
    console.log(error);
  }
}, REFRESH_TIME);

app.listen(process.env.API_PORT, () => {
  console.log(`Server listening on PORT ${process.env.PORT}`);
});

startMongoDB();
