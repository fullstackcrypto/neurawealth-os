# Security Policy

## Supported Versions

| Version      | Supported |
| ------------ | --------- |
| 1.x (latest) | ✅        |

## Reporting a Vulnerability

If you discover a security vulnerability in NeuraWealth OS, please **do not** open a public GitHub issue. Instead:

1. Send an email to the repository maintainer(s) — see the GitHub profile for contact details.
2. Include a description of the vulnerability, steps to reproduce, and (if possible) a suggested fix.
3. We will acknowledge receipt within **48 hours** and aim to release a patch within **14 days** for critical issues.

## Disclosure Policy

We follow [responsible disclosure](https://en.wikipedia.org/wiki/Responsible_disclosure). We will credit researchers who report valid vulnerabilities (unless they prefer to remain anonymous).

## Dependency Security

This project uses [pnpm audit](https://pnpm.io/cli/audit) as part of CI to catch known vulnerabilities in dependencies. Dependabot alerts are also enabled on the repository.

If you find a vulnerability in a dependency used by this project, please report it to the dependency maintainer directly and also notify us so we can update to a patched version promptly.
