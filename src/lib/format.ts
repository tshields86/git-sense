import chalk from 'chalk';
import ora, { Ora } from 'ora';

export function success(message: string): void {
  console.log(chalk.green('✓'), message);
}

export function error(message: string): void {
  console.log(chalk.red('Error:'), message);
}

export function info(message: string): void {
  console.log(chalk.blue('→'), message);
}

export function warning(message: string): void {
  console.log(chalk.yellow('⚠'), message);
}

export function muted(message: string): void {
  console.log(chalk.gray(message));
}

export function header(title: string): void {
  console.log(chalk.blue(`\n${title}\n`));
}

export function sectionHeader(title: string, emoji?: string): void {
  const prefix = emoji ? `${emoji} ` : '';
  console.log(chalk.blue(`\n${prefix}${title}\n`));
}

export function divider(): void {
  console.log(chalk.gray('─'.repeat(40)));
}

export function newline(): void {
  console.log();
}

export function spinner(text: string): Ora {
  return ora(text).start();
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateRange(start: Date, end: Date): string {
  return `${formatDate(start)} - ${formatDate(end)}`;
}

export function maskSecret(secret: string, visibleChars = 4): string {
  if (secret.length <= visibleChars) {
    return '*'.repeat(secret.length);
  }
  return '*'.repeat(secret.length - visibleChars) + secret.slice(-visibleChars);
}

export function printFooter(commitCount: number, prCount: number): void {
  divider();
  muted(`Based on ${commitCount} commits and ${prCount} pull requests`);
}
