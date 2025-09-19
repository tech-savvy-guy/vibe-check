# vibe-check

AI-powered codebase vulnerability scanner with OpenRouter integration.

## 🚀 Local Development & Testing

### Prerequisites

- Node.js 18+ installed
- pnpm installed (`npm install -g pnpm`)
- OpenRouter API key (get one at [OpenRouter](https://openrouter.ai/keys))

### Initial Setup

1. **Clone and Install Dependencies**
   ```bash
   git clone <your-repo-url>
   cd vibe-check
   pnpm install
   ```

2. **Build the Project**
   ```bash
   pnpm build
   ```

### Testing Locally

#### 1. Test in Development Mode

```bash
# Run CLI directly with tsx (recommended for development)
pnpm start --help

# Test configuration commands
pnpm start config --help
pnpm start config show

# Set up configuration (required before scanning)
pnpm start config setup
# You'll be prompted for:
# - OpenRouter API key (starts with sk-or-v1-)
# - AI model selection from available options

# Test scanning
pnpm start scan .                    # Scan current directory
pnpm start scan . -v                 # Verbose mode
pnpm start scan . -o report.json     # Save to file
```

#### 2. Test as Global CLI

```bash
# Link package globally
pnpm link --global

# Now you can use it from anywhere
vibe-check --help
vibe-check config setup
vibe-check scan .

# Unlink when done testing
pnpm unlink --global
```

### Available Commands

#### Configuration Management
```bash
# Initial setup
vibe-check config setup

# View current config
vibe-check config show

# Update existing config
vibe-check config update

# Delete config
vibe-check config delete
```

#### Scanning
```bash
# Basic scan
vibe-check scan [directory]

# Options:
# -v, --verbose     Show detailed progress
# -o, --output      Save report to file
```

### Error Handling Testing

Test how the CLI handles various error scenarios:

1. **Configuration Errors**
   ```bash
   # Delete config and try scanning
   vibe-check config delete
   vibe-check scan .
   # Should show: "Configuration Error: No configuration found..."
   ```

2. **Invalid API Key**
   ```bash
   # Update config with invalid key
   vibe-check config update
   # Enter invalid API key
   vibe-check scan .
   # Should show: "AI Analysis Failed: Invalid API key..."
   ```

3. **Invalid Directory**
   ```bash
   vibe-check scan /nonexistent
   # Should show: "Context Build Error: Failed to scan directory..."
   ```

4. **Empty Directory**
   ```bash
   mkdir empty && cd empty
   vibe-check scan .
   # Should show: "Context Build Error: No supported files found..."
   ```

### Development Tips

1. **Watch Mode**
   ```bash
   pnpm dev
   # This will rebuild on file changes
   ```

2. **Debug Logging**
   ```bash
   # Run with Node.js inspector
   node --inspect $(pnpm bin)/tsx src/cli.ts scan .
   ```

3. **Testing Different Models**
   ```bash
   # Update config to try different models
   vibe-check config update
   # Select 'Model' option and choose a different model
   ```

### Available AI Models

All models are free through OpenRouter:

- **DeepSeek R1** (Default, 163K context) - Excellent reasoning
- **Gemini 2.0 Flash Exp** (1M context) - Fast & capable
- **Llama 3.3 70B** - Balanced performance
- **Qwen 2.5 72B** - Strong coding ability
- **Qwen 2.5 Coder 32B** - Code specialist
- **Mistral Small 3.1 24B** - Efficient & fast
- *And more...*

### Common Issues & Solutions

1. **"Cannot find module" errors**
   ```bash
   pnpm install  # Reinstall dependencies
   pnpm build    # Rebuild the project
   ```

2. **API Rate Limits**
   - Wait a few minutes between scans
   - Try a different model
   - Check OpenRouter dashboard for quota

3. **Large Codebase Analysis**
   - Use verbose mode (`-v`) to monitor progress
   - Analysis is limited to 15 most relevant files
   - Files over 100KB are automatically skipped

### Contributing

1. Fork the repository
2. Create your feature branch
3. Make your changes
4. Run `pnpm build` to ensure everything compiles
5. Create a pull request

## License

MIT

## Author

Soham Datta
