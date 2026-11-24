FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
# La imagen de producción necesita Vite para compilar, pero no los navegadores de pruebas.
RUN CYPRESS_INSTALL_BINARY=0 npm ci
COPY index.html ./
COPY src ./src
COPY public ./public
RUN npm run build && npm prune --omit=dev

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000 DB_PATH=/app/data/gymturno.sqlite
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY server ./server
RUN mkdir -p /app/data && chown node:node /app/data
USER node
EXPOSE 3000
CMD ["node","server/index.js"]
