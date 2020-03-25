import { createLogger, format, transports } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

export interface ILogFileConfig {
    filename: string;
    datePattern: string;
    maxSize: string;
    maxFiles: string;
    level?: string;
}

export interface ILogConfig {
    level: string;
    files: ILogFileConfig[];
}

const _consoleTransport = new transports.Console({
    debugStdout: false,
    format: format.combine(
        format.colorize({ all: true }),
        format.printf((info) => `${info.timestamp}|${info.level}:\n${info.message}`),
    ),
    level: "debug",
});

const dailyRotateFileFormat = format.combine(
    format.timestamp({ format: "hh:mm:ss.SSS" }),
    format.printf((info) => `${info.timestamp}|${info.level}:\n${info.message}`),
);

let _logger = createLogger({
    format: format.combine(
        format.json(),
        format.timestamp({ format: "hh:mm:ss.SSS" }),
    ),
    level: "debug",
    transports: [_consoleTransport],
});

function toDailyRotateFile(file: ILogFileConfig) {
    return new DailyRotateFile({ ...file, dirname: Logger.PATH, format: dailyRotateFileFormat });
}

/**
 * A static class to print log.
 * Print console log by default.
 * Capable of printing log into file(s) by calling Log.init()
 * reference:
 * https://github.com/winstonjs/winston
 * https://github.com/winstonjs/winston-daily-rotate-file
 */
export class Logger {

    public static get PATH() { return Logger._PATH; }

    public static init(config: ILogConfig, path?: string) {
        const { level, files } = config;
        if (path) {
            Logger._PATH = path;
        }
        const dailyRotateFiles = files.map((file) => toDailyRotateFile(file));
        _logger = createLogger({
            level,
            transports: [_logger, ...dailyRotateFiles],
        });
    }

    public static error(message: string | Error | object, ...meta: any[]) {
        switch (typeof message) {
            case "string": return _logger.error(message, ...meta);
            default: break;
        }

        if (message instanceof Error) {
            return _logger.error(`${message.stack}`, ...meta);
        }

        return _logger.error(`${message}`, ...meta);
    }

    public static warn(message: string | Error | object, ...meta: any[]) {
        switch (typeof message) {
            case "string": return _logger.warn(message, ...meta);
            default: return _logger.warn(`${message}`, ...meta);
        }
    }

    public static info(message: string, ...meta: any[]) {
        _logger.info(message, ...meta);
    }

    public static debug(message: string, ...meta: any[]) {
        _logger.debug(message, ...meta);
    }

    public static log(level: "error" | "warn" | "info" | "debug", message: string, ...meta: any[]) {
        _logger.log(level, message, ...meta);
    }

    private static _PATH = ".log";
}
