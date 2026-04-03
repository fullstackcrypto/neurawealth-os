# Contributing to NeuraWealth OS

Thank you for your interest in contributing! We welcome bug reports, feature requests, and pull requests.

---

## Code of Conduct

By participating in this project you agree to abide by the [Contributor Covenant](https://www.contributor-covenant.org/) Code of Conduct.

---

## Getting Started

1. **Fork** the repository and clone your fork.
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Install dependencies: `pnpm install`
4. Make your changes, then verify:
   - `pnpm check` — TypeScript type-check must pass
   - `pnpm format` — code must be Prettier-formatted
   - `pnpm build` — production build must succeed
5. Commit your changes with a descriptive message.
6. Open a **Pull Request** against the `main` branch.

---

## Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR.
- Describe **what** changed and **why** in the PR description.
- Reference any related issues with `Closes #<issue-number>`.
- All CI checks must pass before merging.

---

## Reporting Bugs

Please open a [GitHub Issue](https://github.com/fullstackcrypto/neurawealth-os/issues) with:

- A clear description of the problem.
- Steps to reproduce.
- Expected vs actual behaviour.
- Browser / OS / Node version.

---

## Security Issues

**Do not** open a public issue for security vulnerabilities. See [SECURITY.md](SECURITY.md) for the responsible disclosure process.
