import { createRequest, createResponse } from "node-mocks-http";
import { hashSync } from "bcryptjs";

import { User } from "entity/User";
import { authGuardMiddleware } from "./authGuardMiddleware";
import { TestDataSource } from "test/TestDataSource";
import { generateToken } from "utils/token";

const dataSource = TestDataSource.getInstance();

describe('authGuardMiddleware', () => {
    let user: User;

    beforeAll(async () => {
        await dataSource.initialize();

        const now = new Date();

        user = await User.create({
            fullName: 'John Wick',
            email: 'user@test.com',
            createdAt: now,
            password: hashSync('password', 10),
            isVerified: 1,
        });

        await user.save();
    });

    afterAll(async () => {
        await dataSource.close();
    });
    it('t', () => { });

    it('cannot perform actions without being logged in', async () => {
        const res = createResponse();
        const req = createRequest();
        const next = jest.fn();

        await authGuardMiddleware(req, res, () => { });

        expect(next).not.toHaveBeenCalled();
        expect(res.cookies.token.value).toBeFalsy();
    });

    it('adds user id to body on authentication success', async () => {
        const token = generateToken({ id: user.id });
        const res = createResponse();
        const req = createRequest({
            headers: {
                cookie: `token=${token}`
            }
        });
        const next = jest.fn();

        await authGuardMiddleware(req, res, next);

        expect(req.body.userId).toEqual(user.id);
        expect(next).toHaveBeenCalledTimes(1);
    });

    it('cannot inject other userId', async () => {
        const token = generateToken({ id: user.id });
        const res = createResponse();
        const req = createRequest({
            headers: {
                cookie: `token=${token}`
            },
            body: {
                userId: '123',
            }
        });
        const next = jest.fn();

        await authGuardMiddleware(req, res, next);

        expect(next).not.toHaveBeenCalled();
    });
});