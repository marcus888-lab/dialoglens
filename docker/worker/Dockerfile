FROM oven/bun:1-alpine
WORKDIR /app

# Install dependencies
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client
RUN bunx prisma generate

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S worker -u 1001

# Create writable directory for SQLite
RUN mkdir -p prisma/db && chown -R worker:nodejs prisma/db

USER worker

CMD ["bun", "run", "src/lib/queue/worker.ts"]