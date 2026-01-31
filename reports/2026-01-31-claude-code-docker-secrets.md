---
title: "Running Claude Code in Docker: Container Setup & Secrets Management"
date: 2026-01-31
topic: claude-code-docker
recommendation: Official Anthropic DevContainer with Docker Compose Secrets
version_researched: "@anthropic-ai/claude-code@latest"
use_when:
  - Running Claude Code in isolated development environments
  - CI/CD pipelines requiring automated code assistance
  - Team onboarding with consistent development environments
  - Projects requiring network isolation and security boundaries
  - Multi-project development needing credential separation
avoid_when:
  - Quick one-off tasks where local installation suffices
  - Environments without Docker support
  - When you need full IDE integration (some features lost in container)
project_context:
  language: Node.js, Bash
  relevant_dependencies: Docker, Docker Compose, npm
---

## Summary

Claude Code can be run in Docker containers using several approaches, with the **official Anthropic devcontainer** being the most secure and recommended method[1]. The containerized approach provides isolation from the host system, allowing developers to run Claude with `--dangerously-skip-permissions` safely while maintaining strict network controls through firewall rules[2].

For secrets management, the recommended approach is using **environment variables** set in shell configuration files or Docker Compose secrets for production environments[3]. The `ANTHROPIC_API_KEY` environment variable takes precedence over interactive OAuth authentication, and Docker Sandboxes require this to be set globally since daemon processes don't inherit session variables[4].

Key metrics: The official claude-code repository has active development with frequent updates, Docker Desktop's sandbox feature reached GA status in January 2026 with microVM isolation[5], and multiple community projects (ClaudeBox with 500+ stars, claude-code-sandbox) extend the base functionality[6][7].

## Philosophy & Mental Model

The core principle behind running Claude Code in Docker is **defense in depth**. Even if Claude "goes rogue" or encounters prompt injection attacks, the container isolation prevents it from affecting your host system[8]. Think of the container as a sandbox where Claude can work autonomously within defined boundaries.

**Key abstractions to understand:**

1. **Container as Sandbox**: The Docker container acts as an isolated filesystem and process space. Claude can install packages, modify files, and run commands—but only within the container.

2. **Network Firewall as Gatekeeper**: The `init-firewall.sh` script implements a whitelist-only approach to outbound connections. Only approved domains (npm registry, GitHub, Anthropic API) are accessible[2].

3. **Secrets as Runtime Injection**: Credentials should never be baked into images. They're injected at runtime via environment variables or mounted secret files[9].

4. **Ephemeral vs Persistent State**: Container rebuilds are fast and cheap. Authentication state (`~/.claude/`) can be persisted via volumes while everything else remains ephemeral[10].

## Setup

### Method 1: Official Anthropic DevContainer (Recommended)

This is the officially supported approach using VS Code Dev Containers.

**Prerequisites:**
- VS Code with Remote - Containers extension
- Docker Desktop

```bash
# Clone the reference implementation
git clone https://github.com/anthropics/claude-code.git
cd claude-code

# Open in VS Code, then use Command Palette:
# Cmd+Shift+P → "Remote-Containers: Reopen in Container"
```

**Dockerfile (from official repo):**

```dockerfile
FROM node:20

ARG TZ
ENV TZ="$TZ"
ARG CLAUDE_CODE_VERSION=latest

# Install development tools and network utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    less git procps sudo fzf zsh man-db unzip gnupg2 gh \
    iptables ipset iproute2 dnsutils aggregate jq nano vim \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Set up non-root user
RUN mkdir -p /usr/local/share/npm-global && \
    chown -R node:node /usr/local/share

ARG USERNAME=node

# Persist command history
RUN SNIPPET="export PROMPT_COMMAND='history -a' && export HISTFILE=/commandhistory/.bash_history" \
    && mkdir /commandhistory \
    && touch /commandhistory/.bash_history \
    && chown -R $USERNAME /commandhistory

ENV DEVCONTAINER=true

# Create workspace and config directories
RUN mkdir -p /workspace /home/node/.claude && \
    chown -R node:node /workspace /home/node/.claude

WORKDIR /workspace
USER node

# Configure npm and shell
ENV NPM_CONFIG_PREFIX=/usr/local/share/npm-global
ENV PATH=$PATH:/usr/local/share/npm-global/bin
ENV SHELL=/bin/zsh

# Install Claude Code
RUN npm install -g @anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}

# Copy firewall script (requires NET_ADMIN capability)
COPY init-firewall.sh /usr/local/bin/
USER root
RUN chmod +x /usr/local/bin/init-firewall.sh && \
    echo "node ALL=(root) NOPASSWD: /usr/local/bin/init-firewall.sh" > /etc/sudoers.d/node-firewall
USER node
```

**devcontainer.json:**

```json
{
  "name": "Claude Code Sandbox",
  "build": {
    "dockerfile": "Dockerfile",
    "args": {
      "TZ": "${localEnv:TZ:America/Los_Angeles}",
      "CLAUDE_CODE_VERSION": "latest"
    }
  },
  "runArgs": [
    "--cap-add=NET_ADMIN",
    "--cap-add=NET_RAW"
  ],
  "remoteUser": "node",
  "mounts": [
    "source=claude-code-bashhistory-${devcontainerId},target=/commandhistory,type=volume",
    "source=claude-code-config-${devcontainerId},target=/home/node/.claude,type=volume"
  ],
  "containerEnv": {
    "CLAUDE_CONFIG_DIR": "/home/node/.claude"
  },
  "workspaceMount": "source=${localWorkspaceFolder},target=/workspace,type=bind",
  "workspaceFolder": "/workspace",
  "postStartCommand": "sudo /usr/local/bin/init-firewall.sh"
}
```

### Method 2: Docker Compose with Secrets

For standalone Docker usage with proper secrets management:

```yaml
# docker-compose.yml
version: '3.8'

services:
  claude:
    build: .
    secrets:
      - anthropic_api_key
    environment:
      - ANTHROPIC_API_KEY_FILE=/run/secrets/anthropic_api_key
    volumes:
      - ./:/workspace:delegated
      - claude-config:/home/node/.claude
    working_dir: /workspace
    command: bash -c 'export ANTHROPIC_API_KEY=$(cat $$ANTHROPIC_API_KEY_FILE) && claude'

secrets:
  anthropic_api_key:
    file: ./.secrets/anthropic_api_key.txt

volumes:
  claude-config:
```

```bash
# Create secrets directory
mkdir -p .secrets
echo "sk-ant-api03-xxxxx" > .secrets/anthropic_api_key.txt
chmod 600 .secrets/anthropic_api_key.txt

# Add to .gitignore
echo ".secrets/" >> .gitignore

# Run
docker compose run --rm claude
```

### Method 3: Docker Sandbox (Docker Desktop Feature)

Docker Desktop includes built-in sandbox support for Claude Code[5]:

```bash
# Set API key globally (required for daemon)
echo 'export ANTHROPIC_API_KEY=sk-ant-api03-xxxxx' >> ~/.zshrc
source ~/.zshrc

# Restart Docker Desktop to pick up the variable
# Then create and run sandbox
docker sandbox create claude-project ~/my-project
docker sandbox run claude-project
```

**Note:** Claude launches with `--dangerously-skip-permissions` by default in sandboxes[4].

## Core Usage Patterns

### Pattern 1: Interactive Development with DevContainer

Use this pattern for daily development work with full IDE integration.

```bash
# In VS Code, open project folder
# Cmd+Shift+P → "Remote-Containers: Reopen in Container"

# Claude is available immediately in the integrated terminal
claude

# With dangerous mode enabled (safe in container)
claude --dangerously-skip-permissions
```

### Pattern 2: Headless/CI Mode with API Key

Use this pattern for automation, scripting, and CI/CD pipelines[11].

```bash
# Set API key as environment variable
export ANTHROPIC_API_KEY="sk-ant-api03-xxxxx"

# Run Claude in non-interactive mode with prompt
claude -p "Review the code in src/ for security issues"

# Or with a specific task
claude -p "Fix the failing tests in tests/unit/"
```

**GitHub Actions example:**

```yaml
name: Claude Code Review
on: [pull_request]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          prompt: "/review"
          claude_args: "--max-turns 5"
```

### Pattern 3: Multi-Project Isolation with ClaudeBox

Use this pattern when working on multiple projects requiring separate environments[6].

```bash
# Install ClaudeBox
wget https://github.com/RchGrav/claudebox/releases/latest/download/claudebox.run
chmod +x claudebox.run && ./claudebox.run

# Each project gets its own container with isolated:
# - Docker image
# - Network firewall rules
# - Authentication state
# - Command history

cd ~/project-a && claudebox
cd ~/project-b && claudebox  # Runs in separate container
```

### Pattern 4: Docker Compose with Service Integration

Use this pattern when Claude needs to interact with other services (databases, APIs).

```yaml
version: '3.8'

services:
  claude:
    build: .
    environment:
      - ANTHROPIC_API_KEY
      - DATABASE_URL=postgresql://db:5432/myapp
    depends_on:
      - db
    volumes:
      - ./:/workspace

  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password

secrets:
  db_password:
    file: ./.secrets/db_password.txt
```

### Pattern 5: Credential Forwarding with claude-code-sandbox

Use this pattern for async agentic workflows with approval gates[7].

```bash
# Install
npm install -g @textcortex/claude-code-sandbox

# Run in any git repository
cd ~/my-project
claude-sandbox

# Opens web UI at http://localhost:3456
# - Creates timestamped branch for each session
# - All changes require explicit approval before pushing
# - Credentials forwarded read-only
```

## Anti-Patterns & Pitfalls

### Don't: Hardcode API Keys in Dockerfile

```dockerfile
# BAD: API key visible in image history and layers
FROM node:20
ENV ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
RUN npm install -g @anthropic-ai/claude-code
```

**Why it's wrong:** Build arguments and environment variables set in Dockerfiles become part of the image's metadata. Anyone with access to the image can extract them using `docker history` or by inspecting layers[9].

### Instead: Inject Secrets at Runtime

```dockerfile
# GOOD: No secrets in image
FROM node:20
RUN npm install -g @anthropic-ai/claude-code
# API key provided at runtime via -e or secrets
```

```bash
# Runtime injection
docker run -e ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" claude-image
```

---

### Don't: Run as Root Without Container Isolation

```dockerfile
# BAD: Running as root without isolation
FROM node:20
USER root
RUN npm install -g @anthropic-ai/claude-code
CMD ["claude", "--dangerously-skip-permissions"]
```

**Why it's wrong:** Without proper isolation, a root user in the container could potentially escape to the host system. The `--dangerously-skip-permissions` flag should only be used with proper isolation[12].

### Instead: Use Non-Root User with Explicit Capabilities

```dockerfile
# GOOD: Non-root user with minimal capabilities
FROM node:20
USER node
RUN npm install -g @anthropic-ai/claude-code

# devcontainer.json grants only needed capabilities
# "runArgs": ["--cap-add=NET_ADMIN", "--cap-add=NET_RAW"]
```

---

### Don't: Mount Entire Home Directory

```bash
# BAD: Exposes all host secrets
docker run -v ~/:/home/user claude-image
```

**Why it's wrong:** This exposes `~/.ssh/`, `~/.aws/`, `~/.claude/`, and other sensitive directories to the container. If Claude is compromised via prompt injection, these credentials could be exfiltrated[8].

### Instead: Mount Only Project Directory

```bash
# GOOD: Only workspace is accessible
docker run -v $(pwd):/workspace claude-image
```

---

### Don't: Skip Firewall in Production

```bash
# BAD: Full network access
docker run --network host claude-image
```

**Why it's wrong:** Without network restrictions, a compromised Claude session could exfiltrate data to any external endpoint or be vulnerable to prompt injection attacks from malicious web content[2].

### Instead: Use Whitelist-Only Firewall

```bash
# GOOD: Run the firewall initialization
sudo /usr/local/bin/init-firewall.sh

# Only these domains are accessible:
# - api.anthropic.com (Claude API)
# - registry.npmjs.org (packages)
# - github.com (repos)
# All others blocked by default
```

---

### Don't: Store API Key in Shell History

```bash
# BAD: Key stored in ~/.bash_history
export ANTHROPIC_API_KEY=sk-ant-api03-actual-key-here
```

**Why it's wrong:** Shell history files are often readable and can be accidentally committed or leaked.

### Instead: Use Secrets Manager or Secure File

```bash
# GOOD: Read from secure file
export ANTHROPIC_API_KEY=$(cat ~/.secrets/anthropic_api_key)

# Or use 1Password CLI
export ANTHROPIC_API_KEY=$(op read "op://Development/Anthropic API/credential")
```

## Why This Choice

### Decision Criteria

| Criterion | Weight | How Official DevContainer Scored |
|-----------|--------|----------------------------------|
| Security isolation | High | Excellent - Multi-layer with firewall, user isolation, capability dropping |
| Ease of setup | High | Good - 4 steps for VS Code users, more complex for CLI-only |
| Secrets handling | High | Good - Supports env vars and volume mounts, requires manual setup |
| IDE integration | Medium | Excellent - Full VS Code support with extensions |
| CI/CD compatibility | Medium | Good - Works with devcontainer CLI, GitHub Actions available |
| Community support | Medium | Growing - Official Anthropic support plus active community |
| Customizability | Low | Excellent - Full access to modify Dockerfile, firewall rules |

### Key Factors

- **Official Support**: The devcontainer in `anthropics/claude-code` is maintained by Anthropic, ensuring compatibility with Claude Code updates[1].

- **Defense in Depth**: The combination of Docker isolation + iptables firewall + non-root user provides multiple security layers[2].

- **Production Ready**: Docker Desktop's sandbox feature (GA January 2026) adds microVM isolation for even stronger security boundaries[5].

## Alternatives Considered

### Docker Desktop Sandbox

- **What it is:** Built-in Docker Desktop feature that runs Claude Code in an isolated sandbox VM
- **Why not chosen as primary:** Requires Docker Desktop (not available on all systems), less customizable
- **Choose this instead when:**
  - You want the simplest possible setup
  - You're on macOS or Windows with Docker Desktop
  - You need microVM-level isolation
- **Key tradeoff:** Easier setup vs. less customization

### ClaudeBox

- **What it is:** Third-party tool providing per-project containerized environments with profiles[6]
- **Why not chosen as primary:** Not officially supported by Anthropic, additional dependency
- **Choose this instead when:**
  - You work on many projects with different toolchains
  - You want pre-configured development profiles (Python, Rust, Go, etc.)
  - You need simultaneous isolated instances
- **Key tradeoff:** More features vs. unofficial support

### claude-code-sandbox

- **What it is:** npm package for running Claude in containers with web UI and approval workflow[7]
- **Why not chosen as primary:** Less integrated with IDE, designed for async workflows
- **Choose this instead when:**
  - You want an approval gate before changes are committed
  - You need async "fire and forget" agent workflows
  - You want web-based monitoring of Claude's progress
- **Key tradeoff:** Better approval workflow vs. less IDE integration

### Native Installation (No Docker)

- **What it is:** Direct `npm install -g @anthropic-ai/claude-code` on host
- **Why not chosen:** No isolation - full access to host filesystem and network
- **Choose this instead when:**
  - You fully trust the codebase you're working on
  - You need maximum IDE integration
  - Container overhead is unacceptable
- **Key tradeoff:** Full IDE features vs. no security isolation

## Caveats & Limitations

- **IDE Integration Loss**: Running in a container sacrifices some IDE features like inline diagnostics visibility, seeing which files Claude has open, and line-range selection. Terminal-based operations remain powerful but less visual[10].

- **GitHub Credential Exposure**: Even with container isolation, mounted GitHub authentication (`~/.gitconfig`, GitHub CLI credentials) could be used for destructive repository operations if Claude is compromised[10].

- **Internet Access Risk**: The firewall whitelist still allows access to GitHub and npm, which could potentially be used for prompt injection attacks via malicious package content or repository files[10].

- **Docker Desktop Requirement**: The sandbox feature requires Docker Desktop, which is not available on Linux servers or in some CI environments.

- **Daemon Environment Variables**: Docker Sandboxes use a daemon that doesn't inherit shell session variables. API keys must be set in shell configuration files (`.zshrc`, `.bashrc`) and require Docker Desktop restart[4].

- **Authentication Persistence**: OAuth authentication state in `~/.claude/` should not be shared across untrusted projects, as it contains sensitive tokens that could be exfiltrated[12].

- **Build-Time Secrets**: Using `ARG` for secrets in Dockerfiles leaks them to image history. Use Docker BuildKit's `--secret` flag or inject at runtime only[9].

## References

[1] [Development containers - Claude Code Docs](https://code.claude.com/docs/en/devcontainer) - Official Anthropic documentation for devcontainer setup

[2] [init-firewall.sh - GitHub](https://github.com/anthropics/claude-code/blob/main/.devcontainer/init-firewall.sh) - Firewall initialization script with whitelisted domains

[3] [Managing API key environment variables in Claude Code](https://support.claude.com/en/articles/12304248-managing-api-key-environment-variables-in-claude-code) - Official guide on API key management

[4] [Configure Claude Code - Docker Docs](https://docs.docker.com/ai/sandboxes/claude-code/) - Docker's official documentation for Claude Code sandbox

[5] [Docker Sandboxes: Run Claude Code and More Safely](https://www.docker.com/blog/docker-sandboxes-run-claude-code-and-other-coding-agents-unsupervised-but-safely/) - Docker blog announcing GA sandbox with microVM isolation

[6] [ClaudeBox - GitHub](https://github.com/RchGrav/claudebox) - Community project for containerized Claude Code with profiles

[7] [claude-code-sandbox - GitHub](https://github.com/textcortex/claude-code-sandbox) - NPM package for containerized Claude with approval workflow

[8] [Running Claude Code Safely in Devcontainers](https://www.solberg.is/claude-devcontainer) - Practical guide with security trade-off analysis

[9] [4 Ways to Securely Store & Manage Secrets in Docker](https://blog.gitguardian.com/how-to-handle-secrets-in-docker/) - Best practices for Docker secrets management

[10] [Using Claude Code Safely with Dev Containers](https://nakamasato.medium.com/using-claude-code-safely-with-dev-containers-b46b8fedbca9) - Medium article on devcontainer security

[11] [Claude Code GitHub Actions](https://code.claude.com/docs/en/github-actions) - Official docs for CI/CD integration

[12] [Claude Code Security Best Practices](https://www.backslash.security/blog/claude-code-security-best-practices) - Security recommendations for Claude Code deployment

[13] [Secrets in Compose - Docker Docs](https://docs.docker.com/compose/how-tos/use-secrets/) - Docker Compose secrets management

[14] [Dockerfile - Claude Code DevContainer](https://github.com/anthropics/claude-code/blob/main/.devcontainer/Dockerfile) - Official Dockerfile from Anthropic
