import { IsEmail, MaxLength, MinLength } from 'class-validator';
import { User } from 'entity/User';

export class UserLoginArgs {
  @IsEmail()
  email: string;

  @MaxLength(256)
  @MinLength(8)
  password: string;

  constructor(email: string, password: string) {
    this.email = email;
    this.password = password;
  }
}

export class ChangePasswordArgs {
  @MaxLength(256)
  @MinLength(8)
  userId: string;

  @MaxLength(256)
  @MinLength(8)
  currentPassword: string;

  @MaxLength(256)
  @MinLength(8)
  newPassword: string;

  constructor(userId: string, currentPassword: string, newPassword: string) {
    this.userId = userId;
    this.currentPassword = currentPassword;
    this.newPassword = newPassword;
  }
}

export class NewUser {
  @MaxLength(256)
  @MinLength(1)
  fullName: string;

  @IsEmail()
  email: string;

  @MaxLength(256)
  @MinLength(8)
  password: string;
}

export class AuthOutput {
  token: string;
  user: User;
}
