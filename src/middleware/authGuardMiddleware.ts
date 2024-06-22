import { Request, Response } from "express";
import cookie from 'cookie';

import { verifyToken } from "utils/token";

export async function authGuardMiddleware(req: Request, res: Response, next: Function) {
    try {
        const cookies = cookie.parse(req.headers.cookie || '');
        const token = cookies['token'];

        if (!token) {
            throw new Error('Invalid token');
        }

        if (req.body.userId != null) {
            throw new Error('Unauthorized');
        }

        const tokenData = verifyToken(token);
        const userId = tokenData.id;

        if (!userId) {
            throw new Error('Invalid token');
        }

        req.body.userId = userId;
        next();
    } catch (error) {
        res.cookie('token', '', { expires: new Date(0), httpOnly: true, secure: true });
        res.status(401).render('message', {
            title: 'error',
            message: 'Unauthorized',
        });
    }
}