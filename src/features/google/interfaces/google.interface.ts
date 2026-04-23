
export interface GoogleConnectResponse {
  ok: boolean;
  provider: string;
  auth_url: string;
  redirect_uri: string;
  scope: string;
}

export interface GoogleStatusResponse {
  ok: boolean;
  connected: boolean;
  provider: string;
  account_email?: string;
  token_expires_at?: number;
  has_refresh_token?: boolean;
  scope?: string;
}