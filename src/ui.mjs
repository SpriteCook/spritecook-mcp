import chalk from 'chalk';
import ora from 'ora';

/** Print the SpriteCook header banner */
export function printBanner() {
  console.log();
  console.log(chalk.bold('  SpriteCook MCP Setup'));
  console.log(chalk.dim('  Connect your AI agent to SpriteCook'));
  console.log();
}

/** Print a success message */
export function success(msg) {
  console.log(chalk.green('  [ok]') + ' ' + msg);
}

/** Print an info message */
export function info(msg) {
  console.log(chalk.blue('  [info]') + ' ' + msg);
}

/** Print a warning message */
export function warn(msg) {
  console.log(chalk.yellow('  [warn]') + ' ' + msg);
}

/** Print an error message */
export function error(msg) {
  console.log(chalk.red('  [error]') + ' ' + msg);
}

/** Create a spinner */
export function spinner(text) {
  return ora({ text: '  ' + text, color: 'cyan' });
}

/** Print a step header */
export function step(num, msg) {
  console.log();
  console.log(chalk.bold.white(`  ${num}. ${msg}`));
}
