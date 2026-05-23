import { AppError } from '@/errors/AppError.js';
import type { EmailProvider } from '@/email/email-provider.js';
import { EmailChannelHandler } from '@/notifications/channels/email-channel.js';
import type { NotificationChannelHandler } from '@/notifications/channels/notification-channel.js';
import type {
  NotificationChannel,
  NotificationPayload,
  NotificationResult,
} from '@/notifications/types.js';

export class NotificationService {
  private readonly handlers: Map<NotificationChannel, NotificationChannelHandler>;

  constructor(handlers: NotificationChannelHandler[]) {
    this.handlers = new Map(handlers.map((handler) => [handler.channel, handler]));
  }

  async send(payload: NotificationPayload): Promise<NotificationResult> {
    const tasks = payload.channels.map(async (channel) => {
      const handler = this.handlers.get(channel);
      if (!handler) {
        return {
          channel,
          success: false,
          error: `Unsupported notification channel: ${channel}`,
        };
      }

      const config = this.resolveChannelConfig(channel, payload);
      if (!config) {
        return {
          channel,
          success: false,
          error: `Missing configuration for channel: ${channel}`,
        };
      }

      return handler.send(config);
    });

    const settled = await Promise.allSettled(tasks);
    const results = settled.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }

      return {
        channel: payload.channels[index]!,
        success: false,
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      };
    });

    return {
      results,
      allSucceeded: results.every((result) => result.success),
    };
  }

  private resolveChannelConfig(
    channel: NotificationChannel,
    payload: NotificationPayload,
  ): unknown {
    switch (channel) {
      case 'email':
        return payload.email;
      default: {
        const unsupported: never = channel;
        throw new AppError(`Unsupported channel: ${unsupported}`, 400, 'UNSUPPORTED_CHANNEL');
      }
    }
  }
}

export function createNotificationService(emailProvider: EmailProvider): NotificationService {
  return new NotificationService([new EmailChannelHandler(emailProvider)]);
}
