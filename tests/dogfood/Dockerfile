FROM node:24-bookworm-slim
ARG CODEX_VERSION=0.156.1
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl git gh ripgrep \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g --ignore-scripts @openai/codex@${CODEX_VERSION} \
    && npm cache clean --force
USER node
WORKDIR /workspace
CMD ["sleep", "1800"]
