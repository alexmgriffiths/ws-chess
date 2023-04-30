import { config } from "dotenv";
import { setupSocket } from "./socket";
import express, { json } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import apiController from './controllers/apiController';
import { rateLimit } from "express-rate-limit";

config();
setupSocket();

const app = express();

const limiter = rateLimit({windowMs: 1 * 60 * 1000, max: 25});
app.use(limiter);
app.use(json());
app.use(cors({origin: "*"}));
app.use(helmet());

app.use('/api', apiController);

app.listen(process.env.PORT, () => {
    console.log("SERVER IS LISTENING ON PORT " + process.env.PORT);
})
