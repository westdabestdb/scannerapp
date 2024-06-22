import { Request, Response } from "express";

import { verifyApiKey } from "utils/token";

export async function apiMiddleware(req: Request, res: Response, next: Function) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader?.startsWith('Bearer ')) {
            throw new Error('Invalid api key');
        }

        if (req.body.userId != null) {
            throw new Error('Unauthorized');
        }

        const apiKey = authHeader.substring(7);

        if (!apiKey) {
            throw new Error('Invalid api key');
        }

        const apiKeyData = await verifyApiKey(apiKey);
        const userId = apiKeyData.id;

        if (!userId) {
            throw new Error('Invalid api key');
        }

        req.body.userId = userId;
        next();
    } catch (error) {
        res.status(401).json({
            status: 'error',
            message: 'Unauthorized',
        });
    }
}