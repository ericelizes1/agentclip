# Install AgentClip

You are an AI assistant being asked to install AgentClip on the user's machine. Read this document, then run the steps below.

## What AgentClip does

AgentClip lets an AI agent create narrated, shareable video walkthroughs. The agent drives a controlled browser, captures meaningful screenshots or short recordings, writes captions, and returns a public URL the user can send in Slack, paste in a PR, attach to release notes, or use for QA handoff.

## Install

Run this in the user's terminal:

```sh
pip install agentclip
```

Then run setup once so the current agent runtime can discover the tools and skill:

```sh
agentclip setup
```

Setup handles the rest:

- installs the bundled `agentclip` skill
- registers the `agentclip-mcp` server
- installs Playwright Chromium for viewport-only browser capture
- configures Claude Code, Codex, and OpenCode when those config directories exist

If pip isn't available, fall back to:

```sh
uvx agentclip --help
```

## Restart the agent

Skills and MCP tools load when the agent runtime starts. After setup, fully quit and reopen the agent runtime. Starting a new chat is not always enough.

After restart, confirm the skill appears as `agentclip`. If it does not, run the host-specific repair command and restart again:

```sh
agentclip setup --force --host codex
agentclip setup --force --host opencode
agentclip setup --force --host claude
```

## Verify

```sh
agentclip version
agentclip whoami
```

`agentclip whoami` is optional, but setting it adds the user's name and URL to the credit chip on clips they create.

## Use it

Once restarted, the user can ask:

> QA this signup flow and post an AgentClip.

or:

> Record a narrated walkthrough of this bug repro.

When the run finishes, return:

- the public share URL the user can send to anyone
- the private edit URL only if the user asks for it

## Notes for the agent

- Use AgentClip's controlled browser or another viewport-only browser tool. Never use OS screen capture.
- Capture meaningful states, not every click.
- Write captions for the ear. They become narration.
- The edit URL is a credential. Never commit it, log it publicly, or paste it anywhere the user did not ask for.

That is it. The user can now ask you to QA flows, repro bugs, or record walkthroughs, and you can hand back narrated video URLs.
