import { Router, Request, Response } from 'express';
import UsersService from '../services/userService';

const userService = new UsersService();
const router = Router();

// TODO: Remove this endpoint
router.get('/users', async (_req: Request, res: Response) => {
    const users = await userService.getUsers();
    res.status(200).send(users);
});

router.post('/login', async (req: Request, res: Response) => {
    const {username, password} = req.body;
    const response = await userService.login(username, password);
    res.status(response.status).send(response);
});

router.post('/register', async (req: Request, res: Response) => {
    const {email, username, password} = req.body;
    const response = await userService.register(email, username, password);
    res.status(response.status).send(response);
});

export default router;