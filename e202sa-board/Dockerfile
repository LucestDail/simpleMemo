# e202sa-board - Node 기반 단일 이미지 (빌드 + 서버)
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY frontend/package.json frontend/
RUN cd frontend && npm install

COPY . .
RUN cd frontend && npm run build

# 런타임
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY server.js ./
RUN mkdir -p data

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server.js"]
