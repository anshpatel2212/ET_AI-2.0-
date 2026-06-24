FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json tsconfig.json ./
RUN npm ci --only=production && npm cache clean --force
RUN cp -R node_modules /tmp/node_modules_prod
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 express
COPY --from=builder /tmp/node_modules_prod ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
USER express
EXPOSE 4000
ENV NODE_ENV=production
CMD ["node", "dist/server.js"]
