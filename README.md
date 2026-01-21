# git-sense

AI-powered CLI tool to make sense of git history. Uses Claude to generate summaries, answer questions, analyze contributors, and create changelogs from your repository's commit and PR history.

## Features

- **Summary** - Get a narrative overview of recent repository activity
- **Contributors** - Analyze who's working on what and their focus areas
- **Ask** - Ask natural language questions about your repo's history
- **Changelog** - Generate formatted changelogs between releases

## Requirements

- Node.js 18+
- A GitHub account (for OAuth)
- An Anthropic API key ([get one here](https://console.anthropic.com/api-keys))

## Installation

```bash
npm install -g git-sense
```

Or install from source:

```bash
git clone https://github.com/tshields86/git-sense.git
cd git-sense
npm install
npm run build
npm link
```

## Quick Start

1. **Authenticate with GitHub:**
   ```bash
   git-sense auth
   ```
   This opens a browser flow to authorize the app.

2. **Set your Anthropic API key:**
   ```bash
   git-sense config --anthropic-key sk-ant-xxxxx
   ```
   Or set the `ANTHROPIC_API_KEY` environment variable.

3. **Navigate to a GitHub repository and run:**
   ```bash
   git-sense summary
   ```

## Commands

### `git-sense auth`

Authenticate with GitHub using the OAuth device flow. Required for accessing repository data.

```bash
git-sense auth
```

### `git-sense config`

Manage configuration settings.

```bash
# Show current configuration
git-sense config --show

# Set Anthropic API key
git-sense config --anthropic-key sk-ant-xxxxx

# Clear all configuration
git-sense config --clear
```

### `git-sense summary`

Generate an AI-powered summary of repository activity.

```bash
# Last 2 weeks (default)
git-sense summary

# Last 4 weeks
git-sense summary --weeks 4

# Last 3 months
git-sense summary --months 3

# Entire history
git-sense summary --all
```

### `git-sense contributors`

Analyze contributor activity and focus areas.

```bash
# Last 4 weeks (default)
git-sense contributors

# Last 8 weeks
git-sense contributors --weeks 8

# Last 2 months
git-sense contributors --months 2
```

### `git-sense ask`

Ask natural language questions about your repository's history.

```bash
git-sense ask "When was authentication added?"
git-sense ask "Who knows the API code best?"
git-sense ask "What changed in the last release?"
git-sense ask "Why did we remove Redux?"
```

### `git-sense changelog`

Generate a changelog between two git references.

```bash
# Between two tags
git-sense changelog --from v1.0.0 --to v1.1.0

# From a tag to HEAD
git-sense changelog --from v1.0.0

# Output as markdown (for CHANGELOG.md)
git-sense changelog --from v1.0.0 --format markdown
```

## Configuration

### Environment Variables

- `ANTHROPIC_API_KEY` - Your Anthropic API key (takes precedence over stored config)
- `GITHUB_TOKEN` - GitHub token (takes precedence over OAuth token)

### Config File Location

Configuration is stored using the `conf` package:
- macOS: `~/Library/Preferences/git-sense-nodejs/config.json`
- Linux: `~/.config/git-sense-nodejs/config.json`
- Windows: `%APPDATA%/git-sense-nodejs/config.json`

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev -- summary

# Build for production
npm run build

# Run built version
npm start
```

