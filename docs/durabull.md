# Durabull

[Durabull](https://durabull.io) is a modern BullMQ dashboard for watching queues, inspecting jobs, and debugging failures.

Nuxt Processor creates standard BullMQ queues and workers, so Durabull does not need a Nuxt route or server handler. Run it beside your Nuxt app and point it at the same Redis connection.

## Local Docker quick start

If your Nuxt app connects to Redis on your host machine at `redis://127.0.0.1:6379/0`, run Durabull with:

```bash
docker run --rm -p 127.0.0.1:3000:3000 \
  -e DURABULL_AUTHLESS=true \
  -e DURABULL_ENV_CONNECTIONS=true \
  -e DURABULL_REDIS_URL_ENCRYPTION_KEY=$(openssl rand -hex 32) \
  -e DURABULL_REDIS_URL_MAIN=redis://host.docker.internal:6379/0 \
  -e DURABULL_REDIS_URL_MAIN_ENVIRONMENT=development \
  -e DURABULL_REDIS_URL_DEFAULT=MAIN \
  -e APP_BASE_URL=http://localhost:3000 \
  -e VITE_PUBLIC_APP_URL=http://localhost:3000 \
  ghcr.io/durabullhq/durabull:latest
```

Open `http://localhost:3000`, then select the `MAIN` connection.

::: warning Local use only
`DURABULL_AUTHLESS=true` is intended for trusted local development. Do not expose an authless Durabull instance to a public network.
:::

## Docker Compose or containerized Redis

When Redis runs in Docker, place Durabull on the same Docker network and use the Redis service name:

```bash
docker network create nuxt-processor
docker run -d --name redis --network nuxt-processor redis:8-alpine

docker run --rm -p 127.0.0.1:3000:3000 --network nuxt-processor \
  -e DURABULL_AUTHLESS=true \
  -e DURABULL_ENV_CONNECTIONS=true \
  -e DURABULL_REDIS_URL_ENCRYPTION_KEY=$(openssl rand -hex 32) \
  -e DURABULL_REDIS_URL_MAIN=redis://redis:6379/0 \
  -e DURABULL_REDIS_URL_MAIN_ENVIRONMENT=development \
  -e DURABULL_REDIS_URL_DEFAULT=MAIN \
  -e APP_BASE_URL=http://localhost:3000 \
  -e VITE_PUBLIC_APP_URL=http://localhost:3000 \
  ghcr.io/durabullhq/durabull:latest
```

Use the same Redis database index that your Nuxt app and worker process use.

## Desktop app

For local inspection without Docker, install the Durabull desktop app:

- [Latest macOS and Windows releases](https://github.com/durabullhq/durabull/releases/latest)
- Apple Silicon Homebrew: `brew install --cask durabullhq/tap/durabull`

Add the Redis connection from the desktop app and open the queues dashboard.

## Production

For team or internet-facing deployments, use Durabull's authenticated self-hosting setup instead of authless mode:

- [Self Hosting Setup](https://durabull.io/documentation/self-hosting/setup)
- [Docker Image and Compose](https://durabull.io/documentation/deployment/docker)
- [Security and Hardening](https://durabull.io/documentation/operations/security-and-hardening)
