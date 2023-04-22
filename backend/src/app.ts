import { config } from "dotenv";
import { setupSocket } from "./socket";
import express, { json } from 'express';
import cors from 'cors';
import helmet from 'helmet';

import apiController from './controllers/apiController';

config();
setupSocket();

const app = express();
app.use(json());
app.use(cors());
app.use(helmet());

app.use('/api', apiController);

app.listen(process.env.PORT, () => {
    console.log("SERVER IS LISTENING ON PORT " + process.env.PORT);
})
