export function storeAuthTokens(tokens: { access: string; refresh: string }): void;
export function scheduleTokenRefresh(accessToken: string): void;
export function getAccessToken(): string | null;
export function getRefreshToken(): string | null;
export function clearAuthTokens(): void;

