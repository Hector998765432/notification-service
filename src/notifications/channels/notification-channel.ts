import type { NotificationChannel, NotificationChannelResult } from '@/notifications/types.js';

export interface NotificationChannelHandler {
  readonly channel: NotificationChannel;
  send(config: unknown): Promise<NotificationChannelResult>;
}
