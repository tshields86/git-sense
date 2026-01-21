import { Command } from 'commander';
import { authCommand } from './commands/auth.js';
import { configCommand } from './commands/config.js';
import { summaryCommand } from './commands/summary.js';
import { contributorsCommand } from './commands/contributors.js';
import { askCommand } from './commands/ask.js';
import { changelogCommand } from './commands/changelog.js';

const program = new Command();

program
  .name('git-sense')
  .description('AI-powered CLI tool to make sense of git history')
  .version('0.1.0');

program
  .command('auth')
  .description('Authenticate with GitHub using OAuth device flow')
  .addHelpText('after', `
Examples:
  $ git-sense auth
`)
  .action(authCommand);

program
  .command('config')
  .description('Manage configuration settings')
  .option('--anthropic-key <key>', 'Store Anthropic API key')
  .option('--show', 'Display current configuration')
  .option('--clear', 'Clear all stored configuration')
  .addHelpText('after', `
Examples:
  $ git-sense config --show
  $ git-sense config --anthropic-key sk-ant-xxxxx
  $ git-sense config --clear
`)
  .action(configCommand);

program
  .command('summary')
  .description('Generate AI summary of repository activity')
  .option('--weeks <n>', 'Last n weeks', '2')
  .option('--months <n>', 'Last n months')
  .option('--all', 'Entire history')
  .addHelpText('after', `
Examples:
  $ git-sense summary                # Last 2 weeks (default)
  $ git-sense summary --weeks 4      # Last 4 weeks
  $ git-sense summary --months 3     # Last 3 months
  $ git-sense summary --all          # Entire history
`)
  .action(summaryCommand);

program
  .command('contributors')
  .description('Analyze contributor activity and focus areas')
  .option('--weeks <n>', 'Last n weeks', '4')
  .option('--months <n>', 'Last n months')
  .addHelpText('after', `
Examples:
  $ git-sense contributors           # Last 4 weeks (default)
  $ git-sense contributors --weeks 8
  $ git-sense contributors --months 2
`)
  .action(contributorsCommand);

program
  .command('ask <question>')
  .description('Ask a question about repository history')
  .addHelpText('after', `
Examples:
  $ git-sense ask "When was authentication added?"
  $ git-sense ask "Who knows the API code best?"
  $ git-sense ask "What changed in the last release?"
`)
  .action(askCommand);

program
  .command('changelog')
  .description('Generate changelog between two git references')
  .requiredOption('--from <ref>', 'Starting reference (tag, branch, or commit)')
  .option('--to <ref>', 'Ending reference', 'HEAD')
  .option('--format <type>', 'Output format (pretty, markdown)', 'pretty')
  .addHelpText('after', `
Examples:
  $ git-sense changelog --from v1.0.0 --to v1.1.0
  $ git-sense changelog --from v1.0.0              # Compare to HEAD
  $ git-sense changelog --from main~10 --format markdown
`)
  .action(changelogCommand);

program.parse();
