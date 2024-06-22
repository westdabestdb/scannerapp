import { Request, Response } from "express";
import cookie from 'cookie';

import { verifyToken } from "utils/token";
import { User } from "entity/User";
import { Equal } from "typeorm";

export async function viewMiddleware(req: Request, res: Response, next: Function) {
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

        const user = await User.findOne({ where: { id: Equal(userId) } });

        if (!user || user.role !== 'manager') {
            throw new Error('Invalid user');
        }

        req.body.userId = userId;
        next();
    } catch (error) {
        res.cookie('token', '', { expires: new Date(0), httpOnly: true, secure: true });
        res.render('login');
    }
}