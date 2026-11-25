FROM node:22-alpine

LABEL org.opencontainers.image.title="AI Chili MCP Server (@aichili/mcp)" \
      org.opencontainers.image.description="Official zero-dependency stdio MCP server for AI Chili video & talking-avatar generation" \
      org.opencontainers.image.url="https://aichili.ai" \
      org.opencontainers.image.source="https://github.com/AI-Chili/aichili" \
      org.opencontainers.image.licenses="MIT"

ENV NODE_ENV=production

WORKDIR /app

COPY --chown=node:node package.json SKILL.md README.md LICENSE ./
COPY --chown=node:node bin/ ./bin/
COPY --chown=node:node src/ ./src/

USER node

ENTRYPOINT ["node", "bin/aichili-mcp.mjs"]
