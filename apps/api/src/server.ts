import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { buildApp } from './app.js';
import { loadConfig } from './config.js';

async function main(): Promise<void> {
  const config = loadConfig();
  await mkdir(path.resolve(config.TEMP_PATH), { recursive: true });
  const { app, jobs } = await buildApp(config);

  const shutdown = async () => {
    jobs.stop();
    await app.close();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());

  await app.listen({ host: config.HOST, port: config.APP_PORT });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
