"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
app.get('/', (_req, res) => {
    return res.status(200).send("Hi Sav!");
});
app.listen(3001, () => {
    console.log("Server is listening on port 3001");
});
