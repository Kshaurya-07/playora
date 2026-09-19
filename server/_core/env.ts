import crypto from "crypto";
import fs from "fs";
import path from "path";

let cachedRuntimeSecret: string | null = null;

function resolveSessionSecret(): string {
  if (cachedRuntimeSecret) {
    return cachedRuntimeSecret;
  }

  const envSecret =
    process.env.JWT_SECRET?.trim() ||
    process.env.PLAYORA_SESSION_SECRET?.trim() ||
    process.env.PLAYORA_ENCRYPTION_SECRET?.trim() ||
    process.env.SESSION_SECRET?.trim();

  if (envSecret && envSecret.length > 0) {
    cachedRuntimeSecret = envSecret;
    return envSecret;
  }

  // Check if a local .dev_secret file exists or can be generated
  const devSecretPath = path.resolve(process.cwd(), ".dev_secret");
  try {
    if (fs.existsSync(devSecretPath)) {
      const saved = fs.readFileSync(devSecretPath, "utf-8").trim();
      if (saved.length >= 32) {
        cachedRuntimeSecret = saved;
        return saved;
      }
    }
    const generated = crypto.randomBytes(32).toString("hex");
    try {
      fs.writeFileSync(devSecretPath, generated, { encoding: "utf-8", mode: 0o600 });
    } catch {
      // In read-only filesystems or restricted containers, writing to disk may fail; safely continue
    }
    console.log(
      process.env.NODE_ENV === "production"
        ? "[Security Notice] JWT_SECRET was not provided. Auto-generated secure 256-bit runtime key for this deployment."
        : "[Security] Initialized development session secret in .dev_secret"
    );
    cachedRuntimeSecret = generated;
    return generated;
  } catch (err) {
    // Ultimate fallback: generate high-entropy in-memory cryptographic secret
    const inMemorySecret = crypto.randomBytes(32).toString("hex");
    cachedRuntimeSecret = inMemorySecret;
    return inMemorySecret;
  }
}

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: resolveSessionSecret(),
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};
