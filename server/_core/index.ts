import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

import { initWebSocketServer } from "../socket";
import { validateStartupEnvironment } from "./envValidator";

async function startServer() {
  const validation = validateStartupEnvironment();
  if (!validation.isValid) {
    console.error(
      "\n" +
      "======================================================================\n" +
      "[PLAYORA STARTUP CONFIGURATION ERROR]\n" +
      "The server cannot start due to missing security configuration:\n" +
      validation.errors.map((e) => `  ✗ ${e}`).join("\n") +
      "\n\nPlease review .env.example or set the required environment variables.\n" +
      "======================================================================\n"
    );
    throw new Error(`Startup failed: ${validation.errors.join("; ")}`);
  }

  if (validation.warnings.length > 0) {
    console.log(
      "[Startup Diagnostic]\n" +
      validation.warnings.map((w) => `  ℹ ${w}`).join("\n")
    );
  }

  const app = express();
  const server = createServer(app);
  initWebSocketServer(server);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV !== "production") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
