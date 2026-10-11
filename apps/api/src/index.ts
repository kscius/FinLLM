import { loadConfig } from "./config.js";
import { buildApp } from "./app.js";

async function main() {
  const config = loadConfig();
  const app = await buildApp(config);
  await app.listen({ host: config.API_HOST, port: config.API_PORT });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
