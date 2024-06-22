import { createRequest, createResponse } from 'node-mocks-http';
import { hashSync } from 'bcryptjs';
import { Equal } from 'typeorm';

import { TestDataSource } from "test/TestDataSource";
import { AuthApi } from './AuthApi';
import { generateToken } from 'utils/token';
import { User } from 'entity/User';
import { AccountApi } from './AccountApi';

const dataSource = TestDataSource.getInstance();

const Sendgrid = require('@sendgrid/mail');

jest.mock('@sendgrid/mail', () => ({
    setApiKey: jest.fn(),
    send: jest.fn(),
}));

describe('AuthApi and AccountApi', () => {
    let user: User;
    let admin: User;

    beforeAll(async () => {
        await dataSource.initialize();

        user = User.create({
            fullName: 'John Wick',
            email: 'user@test.com',
            createdAt: new Date(),
            password: hashSync('password', 10),
            isVerified: 1,
        });
        await user.save();

        admin = await User.create({
            fullName: 'Dwayne Johnson',
            role: 'manager',
            email: 'admin@test.com',
            createdAt: new Date(),
            accountIds: JSON.stringify([user.id]),
            password: hashSync('password', 10),
            isVerified: 1,
        });
        await admin.save();
    });

    afterAll(async () => {
        await dataSource.close();
    });

    it('can create a new managed user', async () => {
        const res = createResponse();
        const req = createRequest({
            body: {
                userId: admin.id,
                fullName: 'Leonardo da Vinci',
                email: 'leo@swag.com',
            }
        });

        await AuthApi.createUserHandler(req, res);

        const user = await User.findOne({ where: { email: Equal('leo@swag.com') } });

        const data = res._getJSONData();
        expect(user).toBeTruthy();
        expect(Sendgrid.send).toHaveBeenCalledTimes(1);
        expect(data.message).toEqual('An link to verify the account has been sent to the given email.');
        expect(data.status).toEqual('success');
    });

    it('user must be verified to log in', async () => {
        const res = createResponse();
        const req = createRequest({
            body: {
                email: 'leo@swag.com',
                password: 'password'
            }
        });

        await AuthApi.loginHandler(req, res);

        const data = res._getJSONData();
        expect(data.status).toEqual('error');
        expect(data.message).toEqual('Please verify your account');
        expect(res.cookies.token.value).toBeFalsy();
    });

    it('can set new password', async () => {
        const res = createResponse();
        // TODO: 
    });

    it('can login as verified existing user', async () => {
        const res = createResponse();
        const req = createRequest({
            body: {
                email: 'user@test.com',
                password: 'password'
            }
        });

        await AuthApi.loginHandler(req, res);

        const data = res._getJSONData();
        expect(data.status).toEqual('success');
        expect(res.cookies.token.value).toBeTruthy();
    });

    it('logout clears token cookie', async () => {
        const token = generateToken({ id: user.id });
        const res = createResponse();
        const req = createRequest({
            headers: {
                cookie: `token=${token}`
            }
        });

        await AuthApi.logoutHandler(req, res);

        const data = res._getJSONData();
        expect(data.status).toEqual('success');
        expect(res.cookies.token.value).toBeFalsy();
    });

    it('can generate new api key', async () => {
        const res = createResponse();
        const req = createRequest({
            body: {
                userId: user.id,
            }
        });

        await AuthApi.generateApiKeyHandler(req, res);

        const _user = await User.findOne({ where: { id: Equal(user.id) } });

        const data = res._getJSONData();
        expect(data.status).toEqual('success');
        expect(_user?.apiKey).toBeTruthy();
    });

    it('can update password', async () => {
        const res = createResponse();
        const req = createRequest({
            body: {
                userId: user.id,
                currentPassword: 'password',
                newPassword: 'new-password',
            }
        });

        await AccountApi.changePasswordHandler(req, res);

        const resLogin = createResponse();
        const reqLogin = createRequest({
            body: {
                email: user.email,
                password: 'new-password',
            }
        });

        await AuthApi.loginHandler(reqLogin, resLogin);

        const data = res._getJSONData();
        const dataLogin = resLogin._getJSONData();
        expect(data.status).toEqual('success');
        expect(dataLogin.status).toEqual('success');
        expect(resLogin.cookies.token.value).toBeTruthy();
    });

    it('new password must meet requirements', async () => {
        const res = createResponse();
        const req = createRequest({
            body: {
                userId: user.id,
                currentPassword: 'password',
                newPassword: '1234567',
            }
        });

        await AccountApi.changePasswordHandler(req, res);

        const data = res._getJSONData();
        expect(data.status).toEqual('error');
        expect(data.message).toEqual('Password must be at least 8 characters long.');
    });

    it('can delete managed accounts', async () => {
        const res = createResponse();
        const req = createRequest({
            body: {
                userId: admin.id,
                id: user.id,
            }
        });

        await AccountApi.deleteHandler(req, res);

        const users = await User.find({ where: { id: Equal(user.id) } });
        const data = res._getJSONData();
        expect(data.status).toEqual('success');
        expect(users.length).toEqual(0);
    });

    it('cannot delete non managed accounts', async () => {
        const user2 = await User.create({
            fullName: 'Mark Zuckerberg',
            role: 'user',
            createdAt: new Date(),
            email: 'mark@briskets.com',
            password: hashSync('password', 10),
        });

        await user2.save();

        const res = createResponse();
        const req = createRequest({
            body: {
                userId: admin.id,
                id: user2.id,
            }
        });

        await AccountApi.deleteHandler(req, res);

        const users = await User.find({ where: { id: Equal(user2.id) } });
        const data = res._getJSONData();
        expect(data.status).toEqual('error');
        expect(users.length).toEqual(1);
    });
});