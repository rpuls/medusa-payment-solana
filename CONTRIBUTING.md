# Contributing to Medusa Solana Payment Provider

Thank you for your interest in contributing to the Medusa Solana Payment Provider! This document provides guidelines and instructions for contributing.

## Prerequisites

- A working MedusaJS 2.0 backend project.
- Node.js 22 or higher.
- `npm` or `yarn`.
- Basic knowledge of TypeScript, MedusaJS, and the Solana blockchain.

## Development Setup

To contribute to this project, you need to set it up within a Medusa backend.

1.  **Fork and Clone the Repository**:
    ```bash
    git clone https://github.com/your-username/medusa-payment-solana.git
    ```

2.  **Link the Module to Your Medusa Backend**:

    Navigate to the cloned directory and run:
    ```bash
    npm link
    ```
    Then, navigate to your Medusa backend's root directory and run:
    ```bash
    npm link medusa-payment-solana
    ```
    This will create a symbolic link, allowing you to see your changes in real-time without reinstalling.

3.  **Configure Your Medusa Backend**:

    In your Medusa backend's `.env` file, add the required environment variables. See the `README.md` for a full list of options.
    ```
    SOLANA_MNEMONIC="your 12 or 24-word mnemonic phrase"
    SOLANA_COLD_STORAGE_WALLET="your solana cold storage wallet address"
    COINGECKO_API_KEY="your coingecko api key if you use coingecko"
    ```

4.  **Install Dependencies**:
    In the `medusa-payment-solana` directory, run:
    ```bash
    npm install
    ```

## Development Workflow

1.  **Create a Branch**:
    Create a new branch for your feature or bugfix:
    ```bash
    git checkout -b feature/your-feature-name
    ```

2.  **Make Changes**:
    Make your changes to the module's source code. Since the module is linked, your Medusa backend will automatically pick up the changes.

3.  **Write and Run Tests**:
    Add or update tests for your changes. Run the test suite to ensure everything is working correctly:
    ```bash
    npm test
    ```

4.  **Build the Project**:
    Ensure the project compiles successfully:
    ```bash
    npm run build
    ```

5.  **Commit and Push**:
    Commit your changes following the [conventional commits](https://www.conventionalcommits.org/) format and push your branch.

6.  **Create a Pull Request**:
    Create a pull request against the `main` branch of the original repository.

## Testing

### Unit Tests

Run the Jest test suite with:
```bash
npm test
```

### Manual Testing

To test the payment provider, you should perform real transactions on the Solana devnet or testnet. This involves setting up a storefront, creating an order, and completing a payment using a Solana wallet with devnet/testnet SOL.

## Code Style

This project uses ESLint and Prettier to maintain a consistent code style. Please ensure your code adheres to these standards before submitting a pull request.

## Pull Request Process

1.  Update the `README.md` or other documentation if your changes require it.
2.  Ensure your PR is up-to-date with the `main` branch.
3.  The PR will be reviewed and merged by a maintainer.

## Reporting Issues

When reporting issues, please provide a clear description, steps to reproduce, and any relevant environment details.

## License

By contributing to this project, you agree that your contributions will be licensed under its MIT License.
