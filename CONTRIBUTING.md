# Contributing to NeuraWealth OS

Thank you for your interest in contributing! This document provides guidelines for contributing to the NeuraWealth OS project.

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/neurawealth-os.git
   cd neurawealth-os
   ```
3. **Install** dependencies:
   ```bash
   pnpm install
   ```
4. **Create a branch** for your change:
   ```bash
   git checkout -b feature/my-improvement
   ```
5. **Make your changes**, then run checks:
   ```bash
   pnpm check    # TypeScript type checking
   pnpm format   # Code formatting
   pnpm build    # Verify the build succeeds
   ```
6. **Commit** and **push** your branch, then open a Pull Request.

## Code Style

- **TypeScript** is required for all source files — no `any` types without explicit justification
- **Prettier** handles formatting automatically (`pnpm format`)
- Follow the existing component patterns in `client/src/components/` and `client/src/pages/`
- Use the design tokens from `client/src/index.css` for colors — avoid hardcoding hex values where CSS variables exist
- New UI components should go in `client/src/components/ui/` and follow the shadcn/ui pattern

## Adding New Pages

1. Create `client/src/pages/YourPage.tsx`
2. Add a route in `client/src/App.tsx` inside the `<Switch>`
3. Add a nav item in `client/src/components/AppLayout.tsx` in the `NAV_ITEMS` array

## Reporting Issues

When filing a bug report, please include:
- A clear, descriptive title
- Steps to reproduce the issue
- Expected vs. actual behavior
- Browser/OS information
- Screenshots or console output if applicable

## Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR
- Write a clear description explaining **what** changed and **why**
- Ensure `pnpm check` and `pnpm build` pass before submitting
- Link any related issues with `Closes #123`

## Disclaimer

All trading signals and financial data presented in this application are **for informational purposes only** and do not constitute financial advice. Always do your own research before making investment decisions.
