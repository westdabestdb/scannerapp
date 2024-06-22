export type Result<T = null> = {
    status: 'success' | 'error',
    message?: string,
    data?: T,
};