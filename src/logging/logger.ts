import { getLoggingConfig } from '@/config/logging.js';
import pino, { type Logger as PinoLogger } from 'pino';


export type AppLogger = Logger;

type PinoLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
let root: PinoLogger | null = null;

function getRootPino(): PinoLogger {
    if (!root) {
        const cfg = getLoggingConfig();
        const isDev = cfg.environment === 'development' || cfg.environment === 'local';
        root = pino({
            level: cfg.level,
            redact: [
                'req.headers.authorization',
                'req.headers.x-api-key',
                'password',
                'token',
                'secretAccessKey',
                'accessKeyId',
            ],
            ...(isDev
                ? {
                    transport: {
                        target: 'pino-pretty',
                        options: { colorize: true, translateTime: 'SYS:standard' },
                    },
                }
                : {}),
        });
    }
    return root;
}

export class Logger {
    private readonly context: string;
    private readonly pino: PinoLogger;

    constructor(context: string) {
        this.context = context;
        this.pino = getRootPino().child({ context });
    }

    child(extraContext: string): Logger {
        return new Logger(`${this.context}:${extraContext}`);
    }

    trace(...args: unknown[]): void {
        this.log('trace', args);
    }
    debug(...args: unknown[]): void {
        this.log('debug', args);
    }
    info(...args: unknown[]): void {
        this.log('info', args);
    }
    warn(...args: unknown[]): void {
        this.log('warn', args);
    }
    error(...args: unknown[]): void {
        this.log('error', args);
    }
    fatal(...args: unknown[]): void {
        this.log('fatal', args);
    }

    private log(level: PinoLevel, args: unknown[]): void {
        const method = this.pino[level] as (...a: unknown[]) => unknown;
        method.apply(this.pino, args);
    }
}

export function getLogger(context = 'app'): Logger {
    return new Logger(context);
}