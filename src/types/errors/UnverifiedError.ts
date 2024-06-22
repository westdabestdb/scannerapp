import { ApiError } from "./ApiError";

export class UnverifiedError extends ApiError {
    constructor() {
        super('Please verify your account');
    }
}