import chalk from 'chalk';

const logLevels = {
  info: chalk.blue,
  warn: chalk.yellow,
  error: chalk.red,
  debug: chalk.green,
};

const createLogger = () => {
  const logger = {};

  Object.keys(logLevels).forEach(level => {
    logger[level] = (message) => {
      const colorize = logLevels[level];
      const timestamp = new Date().toISOString();
      console.log(colorize(`[${timestamp}] [${level.toUpperCase()}]: ${message}`));
    };
  });

  return logger;
};

const log = createLogger();

export default log;
