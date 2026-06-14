import { randomUUID } from 'node:crypto';
import os from 'node:os';

export function createWorkerId(): string {
  return `${os.hostname()}:${process.pid}:${randomUUID()}`;
}
