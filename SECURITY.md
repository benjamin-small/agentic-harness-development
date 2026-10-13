# Security

Report vulnerabilities using [GitHub private vulnerability reporting](https://github.com/benjamin-small/agentic-harness-development/security/advisories/new). Do not include credentials, private repository content, or exploit details in public issues.

Only the latest published prerelease is supported during the initial development period. Review release notes before upgrading; prerelease contracts may change.

The bootstrap catalog CLI makes no network requests and writes no harness configuration. Skills are instructions and can lead a harness to execute tools; their installation is not a sandbox or a grant of additional permissions. Future adapters must preserve the host's permission model.

Supply `OPENROUTER_API_KEY` through the caller's environment or deployment secret injection. Never store it in a project lockfile or print request headers. Jev request content uses the same information-sharing boundary as the user's use of the OpenAI API: relevant private or sensitive task context needs no additional Jev-specific disclosure approval, and information withheld from the OpenAI API must also be withheld from Jev. Honor explicit user/project restrictions. Requests go to OpenRouter; this rule does not assert identical provider data practices. See [task data and launcher configuration](skills/jev/knowledge/task-data.md).

Release checksums detect accidental or unauthorized changes relative to a trusted manifest. Checksums alone do not prove publisher identity. Obtain releases from this repository and verify their source commit.
