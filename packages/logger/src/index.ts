import { createLogger, format, transports, Logger } from 'winston';

export { Logger } from 'winston';

export interface Config {
  logLevel: string;
  logStyle: string;
  appName: string;
  moduleName: string;
}

const { combine, timestamp, label, errors, splat, colorize, json, printf } = format;

/*
  Logformat.cli() does not support showing stack traces for some reason.
  That's why we define our own formatter, with improved formatting.
  The only caveat is that we can't display `splat` without importing another library.
 */
const printFormat = (info: any): string => {
  let result = `${info.timestamp} ${info.level} [${info.service}] [${info.label}]: ${info.message}`;

  if (info.stack) {
    result = `${result}\n${info.stack}`;
  }

  return result;
};

/**
  We support 2 logging styles:
  - `json` (default) for production logging and log aggregation
    `{"level":"warn","message":"This is a warn log","timestamp":"2021-11-10 13:02:24", ...}`
  - `cli` for local development
    `2021-11-10 12:58:29 debug [api] [GetDomainActions]: This is a debug log`
 */
const getLogStyle = (logStyle: string): any => {
  if (logStyle === 'cli') {
    return combine(colorize(), printf(printFormat));
  } else {
    return combine(json());
  }
};

/**
 * Creates a logger instance based on the config options.
 * @param config configuration options for the logger instance
 * @returns
 */
export const getLogger = (config: Config): Logger => {
  return createLogger({
    level: config.logLevel,

    format: combine(
      label({ label: config.moduleName }),
      timestamp({
        format: 'YYYY-MM-DD HH:mm:ss',
      }),
      errors({ stack: true }),
      splat(),
      getLogStyle(config.logStyle),
    ),
    defaultMeta: { service: config.appName },
    transports: [new transports.Console()],
  });
};
