import { API_PREFIX } from "@tailorcv/shared";
import { createApp } from "./app";
import { loadEnv } from "./config/env";
import { createLogger } from "./lib/logger";

const env = loadEnv();
const logger = createLogger(env);
const app = createApp({ env, logger });

const server = app.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, env: env.NODE_ENV },
    `API listening on http://localhost:${env.PORT}${API_PREFIX}`,
  );
});

server.on("error", (err) => {
  logger.fatal({ err }, "Failed to start server");
  process.exit(1);
});

// Graceful shutdown (Render sends SIGTERM on deploys/restarts)
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    logger.info({ signal }, "Shutting down");
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  });
}
