import { Router, Request, Response } from 'express';
import userController from './userController';

const router = Router();
router.get('/version', (_req: Request, res: Response) => {
    res.status(200).send({version: 'v1.0.0.0'});
});

router.use('/users', userController);

export default router;