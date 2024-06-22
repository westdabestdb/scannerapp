import Sendgrid from '@sendgrid/mail';
import dotenv from 'dotenv';
import Crypto from 'crypto';
import { Request, Response } from 'express';
import { compareSync, hashSync } from 'bcryptjs';
import { DeleteResult, Equal } from 'typeorm';

import { Result } from 'types/Result';
import { ApiError } from 'types/errors/ApiError';
import { generateToken, verifyToken } from 'utils/token';
import { ChangePasswordArgs } from 'ormtypes/types';
import { User } from 'entity/User';

dotenv.config();

Sendgrid.setApiKey(process.env.SENDGRID_API_KEY!);

export class AccountApi {
    private static async _changePassword(input: ChangePasswordArgs): Promise<boolean> {
        const { userId, currentPassword, newPassword } = input;
        const existingUser = await User.findOne({ where: { id: Equal(userId) } });

        if (currentPassword.length < 8 || newPassword.length < 8) {
            throw new ApiError("Password must be at least 8 characters long.");
        }

        if (!existingUser || !compareSync(currentPassword, existingUser.password)) {
            throw new ApiError("Invalid user or current password.");
        }

        const hashedPass = hashSync(newPassword, 10);
        await User.update({ id: Equal(userId) }, { password: hashedPass });
        return true;
    }

    /**
     * Change password.
     */
    public static async changePasswordHandler(req: Request, res: Response) {
        try {
            const userId = req.body.userId;

            await AccountApi._changePassword({
                userId: userId,
                currentPassword: req.body.currentPassword,
                newPassword: req.body.newPassword
            });

            res.status(200).json(<Result>{
                status: 'success',
                message: 'Password changed successfully',
            });
        } catch (error) {
            if (process.env.LOG_LEVEL === 'debug') {
                console.debug(error);
            };
            const message = error instanceof ApiError ? error.message : 'An error has occurred';
            res.status(400).json(<Result>{
                status: 'error',
                message,
            });
        }
    };

    /**
     * TODO: Verify that this still works
     */
    public static async resetPasswordHandler(req: Request, res: Response) {
        try {
            const email = req.query.email as string;
            const token = req.query.token as string;

            const user = await User.findOne({ where: { email: Equal(email) } });

            if (!user) {
                throw new Error('Invalid email');
            }

            const resetToken = user.resetToken;

            const tokenData = verifyToken(token);
            const resetTokenData = verifyToken(resetToken);

            if (tokenData.id !== resetTokenData.id) {
                throw new Error('Token invalid or expired');
            }

            const password = Crypto.randomBytes(4).toString('hex');
            const hashedPass = hashSync(password, 10);

            await User.update({ id: Equal(user.id) }, { password: hashedPass, resetToken: '' });

            const msg = {
                to: user.email,
                from: process.env.SENDGRID_EMAIL!,
                subject: 'New Password',
                html: `
                    <p>A new password has been automatically generated for you:</p>
                    <p>${password}</p>
                    <p>Please change it once you have logged in.</p>
                `,
            };

            await Sendgrid.send(msg);

            res.status(200).send(
                '<html><body><h2>An email has been sent to you with a new password.</h2></body></html>'
            );
        } catch (error) {
            if (process.env.LOG_LEVEL === 'debug') {
                console.debug(error);
            };
            res.status(400).send(
                '<html><body><h2>Invalid or expired password reset link.</h2></body></html>'
            );
        }
    }

    /**
     * Send reset password email.
     */
    public static async sendResetEmailHandler(req: Request, res: Response) {
        try {
            const email = req.body.email;

            const user = await User.findOne({ where: { email: Equal(email) } });

            if (!user) {
                throw new Error('Invalid email');
            }

            const token = generateToken({ id: user.id }, 600);

            User.update({ id: Equal(user.id) }, { resetToken: token })

            const msg = {
                to: user.email,
                from: process.env.SENDGRID_EMAIL!,
                subject: 'Password Reset Link',
                html: `
                    <p>The following password reset link is valid for 10 minutes:</p>
                    <a href="${process.env.API_URL}/api/auth/reset-password?email=${user.email}&token=${token}">
                    ${process.env.API_URL}/api/auth/reset-password?email=${user.email}&token=${token}</a>
                `,
            };

            await Sendgrid.send(msg);

            res.status(200).json(<Result>{
                status: 'success',
                message: 'Check your email for reset instructions.',
            });
        } catch (error) {
            if (process.env.LOG_LEVEL === 'debug') {
                console.debug(error);
            };
            res.status(400).json(<Result>{
                status: 'error',
                message: 'An error has occurred',
            });
        }
    };

    /**
     * Delete user
     */
    public static async deleteHandler(req: Request, res: Response) {
        try {
            const user = await User.findOne({ where: { id: Equal(req.body.userId) } });
            let data: DeleteResult;

            if (!user) {
                throw new Error('Invalid user');
            }

            if (req.body.id && user.role === 'manager') {
                const accountIds = JSON.parse(user.accountIds);
                const userId = accountIds.find((accountId: string) => accountId === req.body.id) ?? '';
                data = await User.delete({ id: Equal(userId) });
            } else {
                data = await User.delete({ id: Equal(user.id) });
            }

            if (data.affected === 0) {
                throw new Error('Deletion failed');
            }

            res.status(200).json(<Result>{
                status: 'success',
                message: 'User deleted successfully',
            });
        } catch (error) {
            if (process.env.LOG_LEVEL === 'debug') {
                console.debug(error);
            };
            res.status(400).json({
                status: 'error',
                message: 'An error has occurred',
            });
        }
    };
}