import { sign, verify } from 'jsonwebtoken';
import crypto from 'crypto';
import dotenv from "dotenv";

dotenv.config();

const secret = process.env.JWT_SECRET!;
const apiSecret = process.env.JWT_API_SECRET!;

export const generateToken = (payload: {}, expiresIn: number = 2592000) => {
    return sign(payload, secret, { expiresIn });
}

export const verifyToken = (token: string): any => {
    return verify(token, secret);
}

export const generateApiKey = (payload: {}, expiresIn?: number) => {
    const options = expiresIn ? { expiresIn } : {};
    return sign(payload, apiSecret, options);
}

export const verifyApiKey = (token: string): any => {
    return verify(token, apiSecret);
}

/**
 * Generate a random secret.
 * 
 * @param length length of secret in bytes, default is 512 bytes = 4096 bits.
 * @returns the secret 
 */
export const generateSecret = (length: number = 512) => {
    const secret = crypto.randomBytes(length).toString('hex');
    return secret;
}