# SOC 2 requirements

Mirador Labs is preparing a SOC 2 Type 1 audit. This file lists the engineering rules that contributors and coding agents follow in this repository. It is maintained in every Mirador repository and given to coding agents through `AGENTS.md`. This repository is public, so internal infrastructure details are kept out of it.

**How to use it**
- Read it before changing anything it covers: secrets, dependencies, CI, releases or data handling.
- Never weaken a control here to get a change through. If a change needs one to change, stop and ask a maintainer.
- A change that alters a control updates this file in the same pull request.

## Change management

- Every change reaches the default branch through a pull request; branch rules block force-pushes and deletion. Required CI checks must pass and are never skipped or loosened.
- Where this repository publishes releases, only Mirador release managers create release tags, and the release pipeline publishes them, never a person by hand.

## Secure development

- Never commit a secret: no keys, tokens, passwords or credentials in code, tests, fixtures, examples or CI logs. Secrets live in the CI secret store. Secret scanning with push protection stays on.
- Dependency alerts and security updates stay on. Fix confirmed vulnerabilities within **Critical 7 days, High 30 days, Medium 90 days**.
- Add dependencies only from their official registries, pinned by lockfile. Do not add a third-party SDK that sends data off the user's machine (analytics, crash reporting, AI) without Mirador's vendor review.
- Never log secrets, tokens, passwords or user content.

## Data

- No customer or personal data in this repository: tests and examples use made-up data.
- Software that runs on a user's machine sends data only to Mirador's own documented endpoints over TLS 1.2 or higher, and stores credentials in the operating system's secure store where one exists.

## Reporting security issues

- Report a suspected vulnerability privately by email to support@mirador.org (support@terma.ai for Terma) with "Security" in the subject line, never in a public issue.

## This repository

web-sdk is Mirador's browser SDK, published to npm as `@miradorlabs/web-sdk`. It sends traces from a web app to the Mirador ingest gateway over gRPC-Web.

- **Browser keys only.** The client refuses a server key (`assertWebApiKey`, `src/ingest/api-key.ts`) and sends the web key as `x-ingest-api-key`. Never accept, document or log a server key in browser code.
- **Data goes only to the configured ingest endpoint**, by default `https://ingest.mirador.org:443` (`src/ingest/client.ts`).
- **Automatic client metadata is a data-handling decision.** `src/ingest/metadata.ts` collects browser, OS, device, language, screen and timezone details unless `includeUserMeta` is off (README, Automatic Client Metadata Collection). Adding a field that could identify a person needs review before it ships.
- **npm publishing comes only from `.github/workflows/npm-publish.yml`**, by trusted publishing (OIDC), after release-please cuts the release. Never run `npm publish` by hand.
- **Follow the PR template and `CONTRIBUTING.md`**, with tests for every change.
