import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { EmailTemplateName } from '@/email/types.js';
import { applyTemplate } from '@/utils/template.js';

const templateDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'templates');

export async function renderEmailTemplate(
  name: EmailTemplateName,
  vars: Record<string, string | number | null | undefined>,
): Promise<string> {
  const filePath = path.join(templateDir, `${name}.html`);
  const template = await readFile(filePath, 'utf8');
  return applyTemplate(template, vars);
}

export function getDefaultSubjectForTemplate(name: EmailTemplateName): string {
  switch (name) {
    case 'crash-alert':
      return '[CRASH] Application error detected';
    default: {
      const template: never = name;
      throw new Error(`Unknown email template: ${template}`);
    }
  }
}
