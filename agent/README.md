# aether-cli-agent

> Cross-platform CLI agent for Aether — instant, encrypted peer-to-peer terminal sharing over WebRTC.

## Supported Platforms

- **Windows** (x64) — PowerShell / CMD
- **macOS** (Apple Silicon ARM64 & Intel x64) — Zsh / Bash
- **Linux** (x64 & ARM64) — Bash / Zsh / Sh

## Installation

Install globally via npm:

```bash
npm install -g aether-cli-agent
```

Or run directly with npx:

```bash
npx aether-cli-agent
```

## Usage

```bash
# Share your terminal (default)
aether

# Explicit share command
aether share

# Verify WebRTC and PTY runtime health
aether self-test

# Show help
aether --help

# Show version
aether --version
```

### Shell Selection

Aether automatically launches the appropriate shell:

- **Windows:** PowerShell (or configured `%SHELL%`)
- **macOS:** Zsh (default login shell on macOS), falling back to Bash or Sh
- **Linux:** Bash, falling back to Zsh or Sh

To specify a custom shell, set `AETHER_SHELL` or `SHELL`:

```bash
export AETHER_SHELL=/bin/zsh
aether
```

## Configuration

The agent can be configured via environment variables:

| Variable | Description | Default |
|---|---|---|
| `AETHER_SHELL` | Shell binary path override | Auto-detected |
| `SERVER_URL` | Signaling server WebSocket URL | `wss://aether-d8tj.onrender.com` |
| `WEB_URL` | Web viewer frontend URL | `https://useaether.vercel.app` |
| `ICE_SERVERS` | JSON array of STUN/TURN servers | Google Public STUN |
