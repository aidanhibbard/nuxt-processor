FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY playground/package*.json ./playground/
RUN cd playground && npm install

COPY . .
RUN npm run dev:prepare && npm run dev:build

FROM node:22-alpine

WORKDIR /app/playground
ENV NODE_ENV=production

COPY --from=build /app/playground/.output ./.output
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/playground/node_modules ./node_modules

CMD ["node", ".output/server/workers/index.mjs"]
