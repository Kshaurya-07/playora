import crypto from "crypto";
import fs from "fs";
import path from "path";

function resolveSessionSecret(): string {
  const envSecret =
    process.env.JWT_SECRET?.trim() ||
    process.env.PLAYORA_SESSION_SECRET?.trim() ||
    process.env.PLAYORA_ENCRYPTION_SECRET?.trim() ||
    process.env.SESSION_SECRET?.trim();

  if (envSecret && envSecret.length > 0) {
    return envSecret;
  }

  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    console.error(
      "\n" +
      "======================================================================\n" +
      "[SECURITY CONFIGURATION ERROR]\n" +
      "Missing required environment variable: JWT_SECRET (or PLAYORA_SESSION_SECRET)\n" +
      "Add it to your environment configuration and restart the server.\n" +
      "======================================================================\n"
    );
    throw new Error(
      "Missing required environment variable: JWT_SECRET (or PLAYORA_SESSION_SECRET). " +
      "Add it to your environment configuration and restart the server."
    );
  }

  // Development mode: provide a stable, persistent development secret
  const devSecretPath = path.resolve(process.cwd(), ".dev_secret");
  try {
    if (fs.existsSync(devSecretPath)) {
      const saved = fs.readFileSync(devSecretPath, "utf-8").trim();
      if (saved.length >= 32) {
        return saved;
      }
    }
    const generated = crypto.randomBytes(32).toString("hex");
    fs.writeFileSync(devSecretPath, generated, { encoding: "utf-8", mode: 0o600 });
    console.log("[Security] Initialized development session secret in .dev_secret");
    return generated;
  } catch (err) {
    // Fallback in environments where local disk writing is prohibited
    return "playora_dev_super_secure_session_encryption_secret_key_2026_default_64b";
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
