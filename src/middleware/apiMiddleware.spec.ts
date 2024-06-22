import { createRequest, createResponse } from "node-mocks-http";
import { hashSync } from "bcryptjs";

import { User } from "entity/User";
import { TestDataSource } from "test/TestDataSource";
import { generateApiKey, generateToken } from "utils/token";
import { apiMiddleware } from "./apiMiddleware";

const dataSource = TestDataSource.getInstance();

describe('apiMiddleware', () => {
    let user: User;

    beforeAll(async () => {
        await dataSource.initialize();

        const now = new Date();

        user = await User.create({
            fullName: 'John Wick',
            email: 'user@test.com',
            createdAt: now,
            password: hashSync('password', 10),
        });

        await user.save();
    });

    afterAll(async () => {
        await dataSource.close();
    });

    it('cannot perform actions without valid api key', async () => {
        const res = createResponse();
        const req = createRequest();
        const next = jest.fn();

        await apiMiddleware(req, res, () => { });

        const data = res._getJSONData();

        expect(data.message).toEqual('Unauthorized');
        expect(next).not.toHaveBeenCalled();
    });

    it('cannot authenticate with login token', async () => {
        const apiKey = generateToken({ id: user.id });
        const res = createResponse();
        const req = createRequest({
            headers: {
                authorization: `Bearer ${apiKey}`
            }
        });
        const next = jest.fn();

        await apiMiddleware(req, res, next);

        const data = res._getJSONData();

        expect(data.message).toEqual('Unauthorized');
        expect(next).not.toHaveBeenCalled();
    });

    it('adds user id to body on authentication success', async () => {
        const apiKey = generateApiKey({ id: user.id });
        const res = createResponse();
        const req = createRequest({
            headers: {
                authorization: `Bearer ${apiKey}`
            }
        });
        const next = jest.fn();

        await apiMiddleware(req, res, next);

        expect(req.body.userId).toEqual(user.id);
        expect(next).toHaveBeenCalledTimes(1);
    });

    it('cannot inject other userId', async () => {
        const token = generateApiKey({ id: user.id });
        const res = createResponse();
        const req = createRequest({
            headers: {
                authorization: `Bearer ${token}`
            },
            body: {
                userId: 'other-user-id',
            }
        });
        const next = jest.fn();

        await apiMiddleware(req, res, next);

        const data = res._getJSONData();
        expect(next).not.toHaveBeenCalled();
        expect(data.message).toEqual('Unauthorized');
    });
});