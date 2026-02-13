import chalk from 'chalk';
import ora from 'ora';
import { formatBytes } from './utils.js';

let spinner = null;

export function startSpinner(text) {
  spinner = ora(text).start();
  return spinner;
}

export function updateSpinner(text) {
  if (spinner) spinner.text = text;
}

export function succeedSpinner(text) {
  if (spinner) spinner.succeed(text);
  spinner = null;
}

export function failSpinner(text) {
  if (spinner) spinner.fail(text);
  spinner = null;
}

export function info(msg) {
  console.log(chalk.blue('ℹ'), msg);
}

export function success(msg) {
  console.log(chalk.green('✔'), msg);
}

export function warn(msg) {
  console.log(chalk.yellow('⚠'), msg);
}

export function error(msg) {
  console.log(chalk.red('✖'), msg);
}

export function printSummary(results, config) {
  console.log('');
  console.log(chalk.bold('Summary'));
  console.log(chalk.gray('─'.repeat(40)));
  console.log(`  Images processed: ${chalk.cyan(results.filter(r => !r.error).length)}`);

  const errored = results.filter(r => r.error);
  if (errored.length > 0) {
    console.log(`  Errors:           ${chalk.red(errored.length)}`);
  }

  const totalVariants = results.reduce((sum, r) => sum + (r.variants?.length || 0), 0);
  console.log(`  Variants created: ${chalk.cyan(totalVariants)}`);

  const totalBytes = results.reduce(
    (sum, r) => sum + (r.variants?.reduce((s, v) => s + v.size, 0) || 0),
    0
  );
  console.log(`  Total size:       ${chalk.cyan(formatBytes(totalBytes))}`);
  console.log(`  Output:           ${chalk.cyan(config.output)}`);
  console.log('');
}
