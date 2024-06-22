import express from 'express';
import { viewMiddleware } from 'middleware/viewMiddleware';
import { User } from 'entity/User';
import { verifyToken } from 'utils/token';

export const viewRouter = express.Router();

viewRouter.get('/control-panel', viewMiddleware, async (req, res) => {
    try {
        const users = await User.find({ select: ['id', 'fullName', 'email', 'role'] });

        res.render('control-panel', { users });
    } catch (error) {
        res.status(400).json();
    }
});

viewRouter.get('/verify', async (req, res) => {
    try {
        const token = req.query.token as string;

        if (!token?.length) {
            throw new Error('Invalid or expired verification link.');
        }

        res.render('verify-account', { token });
    } catch (error) {
        res.render('message', { title: "Error", message: 'Invalid or expired verification link.' });
    }
});

viewRouter.get('/success', async (req, res) => {
    res.render('message', { title: "Success", message: 'Account verified successfully, you can now close this page.' });
});