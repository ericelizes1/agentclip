# Install AgentClip (for AI agents)

You're an AI assistant being asked to install AgentClip on the user's machine. Read this document, then run the steps below.

## What AgentClip does

AgentClip turns an agent QA run into a shareable URL. The agent drives the user's browser, captures meaningful moments with active-voice captions, and ships back a public link the user can drop in Slack or paste in a PR.

## Install (one step)

Run this in the user's terminal:

```sh
pip install agentclip
```

Lazy first-run setup handles the rest:
- The Claude Code skill registers automatically the first time `agentclip` is invoked.
- Browser drivers (Playwright Chromium) install on first use of the recording tools.
- No separate `agentclip setup` step. No config file.

If pip isn't available, fall back to:

```sh
uvx agentclip --help
```

## Reload your session

The skill is registered into the user's Claude Code config. Reload your session so the skill becomes visible:
- Quit and reopen the conversation, **or**
- Run `/skills` and confirm `agentclip` appears.

## Test against any URL

Confirm the install works:

```sh
agentclip clip https://example.com --title "smoke test"
```

When the run finishes, surface two URLs back to the user:
- The public **share URL** they can send to anyone.
- The **edit URL** they should keep private (it's the only way to edit captions later).

## Notes for the agent

- Don't store the share URL in a public location without confirming with the user.
- The edit URL is a credential. Never paste it into chat logs the user can't see, never commit it to a repo.
- `agentclip whoami "Their Name"` is optional but improves the "Filed by" credit on the public viewer.

That's it. The user can now ask you to QA flows, repro bugs, or record walkthroughs, and you'll ship them URLs.
