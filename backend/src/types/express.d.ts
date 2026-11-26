export interface AuthContext {
    userId: string;
}

declare global {
    namespace Express {
        interface Request {
            requestId: string;
            auth?: AuthContext;
        }
    }
}
