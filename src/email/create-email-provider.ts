import type { Env } from '@/config/env.js';
import type { EmailProvider } from '@/email/email-provider.js';
import { ResendEmailProvider } from '@/email/providers/resend-email-provider.js';

export function createEmailProvider(env: Env): EmailProvider {
  switch (env.EMAIL_PROVIDER) {
    case 'resend':
      return new ResendEmailProvider(env.RESEND_API_KEY, env.EMAIL_FROM);
    default: {
      const provider: never = env.EMAIL_PROVIDER;
      throw new Error(`Unsupported email provider: ${provider}`);
    }
  }
}
