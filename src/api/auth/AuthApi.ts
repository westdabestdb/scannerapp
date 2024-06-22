import { Request, Response } from "express";
import { compareSync, hashSync } from "bcryptjs";
import { Equal } from "typeorm";
import dotenv from "dotenv";
import Sendgrid from "@sendgrid/mail";

import { generateApiKey, generateToken, verifyToken } from "utils/token";
import { AuthOutput, NewUser, UserLoginArgs } from "ormtypes/types";
import { Result } from "types/Result";
import { ApiError } from "types/errors/ApiError";
import { UnverifiedError } from "types/errors/UnverifiedError";
import { User } from "entity/User";

dotenv.config();

Sendgrid.setApiKey(process.env.SENDGRID_API_KEY!);

export class AuthApi {
  private static async _login(input: UserLoginArgs): Promise<AuthOutput> {
    const { email, password } = input;
    const existingUser = await User.findOne({ where: { email: Equal(email) } });

    if (!existingUser || !password) {
      throw Error("Invalid user");
    }

    if (!existingUser.isVerified) {
      throw new UnverifiedError();
    }

    if (!compareSync(password, existingUser.password)) {
      throw new Error("Invalid combination of email and password.");
    }

    const token = generateToken({
      id: existingUser.id,
    });

    const output = new AuthOutput();
    output.token = token;
    output.user = existingUser;

    return output;
  }

  private static async _register(input: NewUser): Promise<AuthOutput> {
    const { fullName, email, password } = input;

    const emailTaken = (await User.find({ where: { email: Equal(email) } }))
      .length;

    if (emailTaken) {
      throw new ApiError("Email adress already exists.");
    }

    if (password.length < 8) {
      throw new ApiError("Password must be at least 8 characters long.");
    }

    const hashedPass = hashSync(password, 10);
    const today = new Date();

    const user = await User.create({
      fullName,
      createdAt: today,
      email,
      password: hashedPass,
    }).save();

    const token = generateToken({
      id: user.id,
    });

    const output = new AuthOutput();
    output.token = token;
    output.user = user;

    return output;
  }

  /**
   * Register new user.
   */
  public static async registerHandler(req: Request, res: Response) {
    try {
      const data = req.body;

      const user = await AuthApi._register({
        fullName: data.fullName,
        email: data.email,
        password: data.password,
      }).then((output) => output.user);

      const token = generateToken({ id: user.id }, 600);

      const emailFrom = process.env.SENDGRID_EMAIL;

      if (!emailFrom) {
        throw new Error("Invalid email");
      }

      const msg = {
        to: user.email,
        from: emailFrom,
        subject: "B4Y Scanner App - Verify Account",
        html: `
                    <p>The following verification link is valid for 10 minutes:</p>
                    <a href="${process.env.API_URL}/verify?email=${user.email}&token=${token}">
                    ${process.env.API_URL}/verify?email=${user.email}&token=${token}</a>
                `,
      };

      await Sendgrid.send(msg);

      res.status(200).json(<Result<{ token: string }>>{
        status: "success",
        message: "An email with further instructions has been sent.",
      });
    } catch (error) {
      if (process.env.LOG_LEVEL === "debug") {
        console.debug(error);
      }
      const message =
        error instanceof ApiError ? error.message : "An error has occurred";
      res.status(400).json(<Result>{
        status: "error",
        message,
      });
    }
  }

  /**
   * Verify new user.
   */
  public static async verifyHandler(req: Request, res: Response) {
    try {
      const data = req.body;

      const tokenData = verifyToken(data.token);

      const user = await User.findOne({ where: { id: Equal(tokenData.id) } });

      if (!user) {
        throw new ApiError("Invalid user");
      }

      if (data.password.length < 8 || data.password.length > 32) {
        throw new ApiError("Password must be between 8 and 32 characters");
      }

      if (data.password !== data.passwordConfirm) {
        throw new ApiError("Passwords do not match");
      }

      user.password = hashSync(data.password, 10);
      user.isVerified = 1;

      await user.save();

      res.status(200).json(<Result<{ token: string }>>{
        status: "success",
        message: "User verified successfully",
      });
    } catch (error) {
      if (process.env.LOG_LEVEL === "debug") {
        console.debug(error);
      }
      const message =
        error instanceof ApiError ? error.message : "An error has occurred";
      res.status(400).json(<Result>{
        status: "error",
        message,
      });
    }
  }

  /**
   * Create new managed user. Password will be generated automatically.
   */
  public static async createUserHandler(req: Request, res: Response) {
    try {
      const data = req.body;
      const manager = await User.findOne({ where: { id: Equal(data.userId) } });

      if (!manager || manager.role !== "manager") {
        throw new ApiError("Insufficient permissions");
      }

      const user = await AuthApi._register({
        fullName: data.fullName,
        email: data.email,
        password: Math.random().toString(36).slice(-16),
      }).then((output) => output.user);

      const token = generateToken({ id: user.id }, 600);

      const emailFrom = process.env.SENDGRID_EMAIL;

      if (!emailFrom) {
        throw new Error("Invalid email");
      }

      const msg = {
        to: user.email,
        from: emailFrom,
        subject: "B4Y Scanner App - Verify Account",
        html: `
                    <p>The following verification link is valid for 10 minutes:</p>
                    <a href="${process.env.API_URL}/verify?email=${user.email}&token=${token}">
                    ${process.env.API_URL}/verify?email=${user.email}&token=${token}</a>
                `,
      };

      await Sendgrid.send(msg);

      const accountIds = JSON.parse(manager.accountIds) ?? [];
      accountIds.push(user.id);
      manager.accountIds = JSON.stringify(accountIds);

      await manager.save();

      res.status(200).json(<Result<{ token: string }>>{
        status: "success",
        message:
          "An link to verify the account has been sent to the given email.",
      });
    } catch (error) {
      if (process.env.LOG_LEVEL === "debug") {
        console.debug(error);
      }
      const message =
        error instanceof ApiError
          ? error.message
          : "Invalid combination of email and password";
      res.status(400).json(<Result>{
        status: "error",
        message,
      });
    }
  }

  /**
   * Login user.
   */
  public static async loginHandler(req: Request, res: Response) {
    try {
      const data = await AuthApi._login({
        email: req.body.email,
        password: req.body.password,
      });

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 3);

      res.cookie("token", data.token, {
        expires: expiryDate,
        httpOnly: true,
        secure: true,
      });
      res.status(200).json(<Result>{
        status: "success",
        message: "Login successful",
      });
    } catch (error: any) {
      if (process.env.LOG_LEVEL === "debug") {
        console.debug(error);
      }
      const message =
        error instanceof ApiError
          ? error.message
          : "Invalid combination of email and password";
      res.cookie("token", "", {
        expires: new Date(0),
        httpOnly: true,
        secure: true,
      });
      res.status(400).json(<Result>{
        status: "error",
        message: message,
      });
    }
  }

  /**
   * Logout user. Clears token cookie.
   */
  public static async logoutHandler(req: Request, res: Response) {
    try {
      res.cookie("token", "", {
        expires: new Date(0),
        httpOnly: true,
        secure: true,
      });
      res.status(200).json(<Result>{
        status: "success",
        message: "Logout successful",
      });
    } catch (error) {
      if (process.env.LOG_LEVEL === "debug") {
        console.debug(error);
      }
      res.cookie("token", "", {
        expires: new Date(0),
        httpOnly: true,
        secure: true,
      });
      res.status(400).json(<Result>{
        status: "error",
        message: "An error has occured",
      });
    }
  }

  /**
   * Generate API key for user.
   */
  public static async generateApiKeyHandler(req: Request, res: Response) {
    try {
      const userId = req.body.userId;

      const user = await User.findOne({ where: { id: Equal(userId) } });

      if (!user) {
        throw new Error("Invalid user");
      }

      const apiKey = generateApiKey({ id: user.id });

      await User.update({ id: Equal(userId) }, { apiKey: apiKey });

      res.status(200).json(<Result>{
        status: "success",
        message: "API key generated successfully",
      });
    } catch (error) {
      if (process.env.LOG_LEVEL === "debug") {
        console.debug(error);
      }
      res.status(400).json(<Result>{
        status: "error",
        message: "An error has occurred",
      });
    }
  }
}
