export interface TErrorSources {
    path: string;
    message: string;
}

export interface TErrorResponse {
    statusCode?: number | undefined;
    success: boolean;
    message: string;
    errorSources: TErrorSources[];
    stack?: string;
    error?: unknown;
}