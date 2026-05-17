# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.x     | :white_check_mark: |
| 1.x     | :x:                |
| 0.x     | :x:                |

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Report security issues privately via [GitHub Security Advisories](https://github.com/aidanhibbard/nuxt-processor/security/advisories/new) (preferred) or by emailing the repository owner through their GitHub profile contact options.

Include:

- A description of the issue and its impact
- Steps to reproduce or a proof of concept
- Affected versions and configuration (Nuxt version, deployment setup, Redis exposure, etc.)

You can expect an initial response within a reasonable timeframe. We will work with you on a fix and coordinated disclosure when appropriate.

## Scope

This policy covers the **nuxt-processor** package and its published runtime (module, CLI, generated workers entry). Issues in downstream dependencies (BullMQ, ioredis, Nuxt, Redis itself) should be reported to those projects when they are the root cause.
