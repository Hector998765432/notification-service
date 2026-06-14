import { notificationHandler } from '@/jobs/handlers/notification-handler.js';
import type { CronJobHandler } from '@/types/jobs/index.js';

export class JobRegistry {
  private readonly handlers = new Map<string, CronJobHandler>();

  register(taskKey: string, handler: CronJobHandler): void {
    if (this.handlers.has(taskKey)) {
      throw new Error(`Job handler already registered for task_key "${taskKey}"`);
    }

    this.handlers.set(taskKey, handler);
  }

  get(taskKey: string): CronJobHandler | undefined {
    return this.handlers.get(taskKey);
  }

  has(taskKey: string): boolean {
    return this.handlers.has(taskKey);
  }

  keys(): string[] {
    return [...this.handlers.keys()].sort();
  }
}

export function createDefaultJobRegistry(): JobRegistry {
  const registry = new JobRegistry();

  registry.register('internal.noop', async () => ({
    metadata: {
      message: 'No-op job executed successfully',
    },
  }));

  registry.register('internal.notification', notificationHandler);

  return registry;
}
