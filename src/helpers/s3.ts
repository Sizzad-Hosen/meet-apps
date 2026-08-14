import { EgressClient, RoomServiceClient, WebhookReceiver } from 'livekit-server-sdk';
import config from '../app/config';

const { url: liveKitUrl, api_key: liveKitApiKey, api_secret: liveKitApiSecret } = config.livekit;

export const clientes = {
  egressClient: new EgressClient(liveKitUrl, liveKitApiKey, liveKitApiSecret),
  roomServiceClient: new RoomServiceClient(liveKitUrl, liveKitApiKey, liveKitApiSecret),
  webhookReceiver: new WebhookReceiver(liveKitApiKey, liveKitApiSecret),
};
