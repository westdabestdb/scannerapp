export class PublishError extends Error {
    constructor() {
        super("Failed to publish scan list");
    }
}