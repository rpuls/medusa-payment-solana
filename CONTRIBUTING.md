# Contributing to Medusa Solana Payment Provider

Thank you for your interest in contributing to the Medusa Solana Payment Provider! This document provides guidelines and instructions for contributing.

## Prerequisites

- Node.js 16 or higher
- Yarn or npm
- Basic knowledge of TypeScript, Medusa.js, and Solana blockchain

## Development Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/medusa-payment-solana.git
   cd medusa-payment-solana
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a `.env` file with your Solana wallet address:
   ```
   SOLANA_MNEMONIC=your_solana_wallet_address
   ```
5. Build the project:
   ```bash
   npm run build
   ```

## Development Workflow

1. Create a new branch for your feature or bugfix:
   ```bash
   git checkout -b feature/your-feature-name
   ```
   or
   ```bash
   git checkout -b fix/issue-you-are-fixing
   ```

2. Make your changes and ensure they follow the project's coding style

3. Write tests for your changes

4. Run tests to ensure everything works:
   ```bash
   npm test
   ```

5. Build the project to ensure it compiles:
   ```bash
   npm run build
   ```

6. Commit your changes following [conventional commits](https://www.conventionalcommits.org/) format:
   ```bash
   git commit -m "feat: add new feature"
   ```
   or
   ```bash
   git commit -m "fix: resolve issue with payment status"
   ```

7. Push your branch:
   ```bash
   git push origin feature/your-feature-name
   ```

8. Create a pull request against the main repository

## Testing

### Unit Tests

Run unit tests with:

```bash
npm test
```

### Manual Testing

You can manually test the payment provider by:

1. Building the project:
   ```bash
   npm run build
   ```

2. Simulating a payment:
   ```bash
   npm run simulate-payment
   ```

## Code Style

This project uses:

- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting

Please ensure your code follows these standards before submitting a pull request.

## Pull Request Process

1. Update the README.md or documentation with details of changes if appropriate
2. Update the version number in package.json following [semantic versioning](https://semver.org/)
3. The PR will be merged once it has been reviewed and approved by a maintainer

## Reporting Issues

When reporting issues, please include:

- A clear and descriptive title
- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- Screenshots if applicable
- Environment details (OS, Node.js version, etc.)

## Feature Requests

Feature requests are welcome! Please provide:

- A clear and detailed description of the feature
- The motivation behind the feature
- Any potential implementation details you have in mind

## License

By contributing to this project, you agree that your contributions will be licensed under the project's MIT License.
