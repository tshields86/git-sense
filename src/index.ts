import { Command } from 'commander';

const program = new Command();

program
  .name('git-sense')
  .description('AI-powered CLI tool to make sense of git history')
  .version('0.1.0');

program
  .command('auth')
  .description('Authenticate with GitHub using OAuth')
  .action(() => {
    console.log('Auth command - not yet implemented');
  });

program
  .command('config')
  .description('Manage configuration settings')
  .option('--anthropic-key <key>', 'Store Anthropic API key')
  .option('--show', 'Display current configuration')
  .option('--clear', 'Clear all stored configuration')
  .action(() => {
    console.log('Config command - not yet implemented');
  });

program
  .command('summary')
  .description('Generate AI summary of repository activity')
  .option('--weeks <n>', 'Last n weeks', '2')
  .option('--months <n>', 'Last n months')
  .option('--all', 'Entire history')
  .action(() => {
    console.log('Summary command - not yet implemented');
  });

program
  .command('contributors')
  .description('Analyze contributor activity and focus areas')
  .option('--weeks <n>', 'Last n weeks', '4')
  .option('--months <n>', 'Last n months')
  .action(() => {
    console.log('Contributors command - not yet implemented');
  });

program
  .command('ask <question>')
  .description('Ask a question about repository history')
  .action((question: string) => {
    console.log(`Ask command - not yet implemented. Question: ${question}`);
  });

program
  .command('changelog')
  .description('Generate changelog between two git references')
  .requiredOption('--from <ref>', 'Starting reference')
  .option('--to <ref>', 'Ending reference', 'HEAD')
  .option('--format <type>', 'Output format (pretty, markdown)', 'pretty')
  .action(() => {
    console.log('Changelog command - not yet implemented');
  });

program.parse();
