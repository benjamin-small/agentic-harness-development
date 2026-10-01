# Security

Report vulnerabilities using [GitHub private vulnerability reporting](https://github.com/benjamin-small/agentic-harness-development/security/advisories/new). Do not include credentials, private repository content, or exploit details in public issues.

Only the latest published prerelease is supported during the initial development period. Review release notes before upgrading; prerelease contracts may change.

The bootstrap catalog CLI makes no network requests and writes no harness configuration. Skills are instructions and can lead a harness to execute tools; their installation is not a sandbox or a grant of additional permissions. Future adapters must preserve the host's permission model.

Supply `OPENROUTER_API_KEY` through the caller's environment or deployment secret injection when the Jev runtime is implemented. Never store it in a project lockfile or print request headers. API request state may contain private project data; the caller chooses what is sent to OpenRouter.

Release checksums detect accidental or unauthorized changes relative to a trusted manifest. Checksums alone do not prove publisher identity. Obtain releases from this repository and verify their source commit.
