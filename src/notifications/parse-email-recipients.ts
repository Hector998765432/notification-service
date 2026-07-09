export function parseEmailRecipients(value: string): string[] {
  return value
    .split(',')
    .map((email) => email.trim())
    .filter((email) => email.length > 0);
}
