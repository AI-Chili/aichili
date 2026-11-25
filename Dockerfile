FROM node:22-alpine

LABEL io.modelcontextprotocol.server.name="io.github.AI-Chili/aichili" \
      org.opencontainers.image.title="AI Chili Official CLI & MCP Server" \
      org.opencontainers.image.description="Official zero-dependency CLI and stdio MCP server for AI Chili (AIChili) cinematic AI video generation" \
      org.opencontainers.image.url="https://aichili.ai/mcp" \
      org.opencontainers.image.source="https://github.com/AI-Chili/aichili" \
      org.opencontainers.image.licenses="MIT"

ENV NODE_ENV=production

WORKDIR /app

COPY --chown=node:node package.json SKILL.md README.md LICENSE ./
COPY --chown=node:node bin/ ./bin/
COPY --chown=node:node src/ ./src/

USER node

ENTRYPOINT ["node", "bin/aichili-mcp.mjs"]
