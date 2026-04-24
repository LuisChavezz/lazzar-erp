import { v1_api } from "@/src/api/v1.api";
import { GoogleConnectResponse, GoogleEmailPayload, GoogleSendEmailResponse, GoogleStatusResponse } from "../interfaces/google.interface";


export const googleConnect = async (redirect_url: string): Promise<GoogleConnectResponse> => {
  const response = await v1_api.post<GoogleConnectResponse>("/ai/google/oauth/connect/", {
    next: redirect_url
  });
  return response.data;
}

export const googleStatus = async (): Promise<GoogleStatusResponse> => {
  const response = await v1_api.get<GoogleStatusResponse>("/ai/google/oauth/status/");
  return response.data;
}

export const googleDisconnect = async (): Promise<{ok: boolean}> => {
  const response = await v1_api.post<{ok: boolean}>("/ai/google/oauth/disconnect/");
  return response.data;
}

export const googleSendEmail = async (payload: GoogleEmailPayload): Promise<GoogleSendEmailResponse> => {
  const response = await v1_api.post<GoogleSendEmailResponse>("/ai/google/gmail/send/", payload);
  return response.data;
}
