import { Router } from 'express';

import { authGuardMiddleware } from "middleware/authGuardMiddleware";
import { AuthApi } from 'api/auth/AuthApi';
import { AccountApi } from 'api/auth/AccountApi';
import { ScanApi } from './scan/ScanApi';
import { SSNNorwayApi } from './ssn-norway/SSNNorwayApi';

const authRouter = Router();
const scanRouter = Router();
const SSNNorwayRouter = Router();
const apiRouter = Router();

authRouter.post('/register', AuthApi.registerHandler);
authRouter.post('/verify', AuthApi.verifyHandler);
authRouter.post('/login', AuthApi.loginHandler);
authRouter.get('/logout', AuthApi.logoutHandler);
authRouter.get('/reset-password', AccountApi.resetPasswordHandler);
authRouter.post('/send-reset-email', AccountApi.sendResetEmailHandler);
authRouter.put('/change-password', authGuardMiddleware, AccountApi.changePasswordHandler);
authRouter.delete('/delete-account', authGuardMiddleware, AccountApi.deleteHandler);
authRouter.post('/create-account', authGuardMiddleware, AuthApi.createUserHandler);
authRouter.post('/delete-account', authGuardMiddleware, AccountApi.deleteHandler);

scanRouter.post('/ticket', ScanApi.scanTicketHandler);
scanRouter.post('/ocr', ScanApi.scanOcrHandler);
scanRouter.get('/by-voyage-id/:id', ScanApi.getByVoyageIdHandler);

SSNNorwayRouter.get('/by-ship-name/:name', SSNNorwayApi.getVoyagesByNameHandler);
SSNNorwayRouter.post('/:id', SSNNorwayApi.publishHandler);
SSNNorwayRouter.post('/', SSNNorwayApi.publishNewHandler);

apiRouter.use('/auth', authRouter);
apiRouter.use('/scan', authGuardMiddleware, scanRouter);
apiRouter.use('/ssn-norway', authGuardMiddleware, SSNNorwayRouter);

export { apiRouter };