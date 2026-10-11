import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  API_HOST: z.string().default("0.0.0.0"),
  API_PORT: z.coerce.number().default(3001),
  SESSION_SECRET: z.string().min(32),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  TRUST_PROXY: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  ALLOW_REGISTRATION: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  /** When set, POST /api/v1/setup/initialize requires header X-Setup-Bootstrap with this value. */
  SETUP_BOOTSTRAP_SECRET: z.string().min(32).optional(),
  /** Unauthenticated GET /api/v1/setup/status when instance already has a user (prod default: false). */
  ALLOW_PUBLIC_SETUP_STATUS: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  INVALIDATE_OTHER_SESSIONS_ON_LOGIN: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  MCP_TOKEN_DEFAULT_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(90),
  FINLLM_BOOK_CURRENCY: z.enum(["MXN", "USD"]).default("MXN"),
  FINLLM_TIMEZONE: z.string().default("America/Mexico_City"),
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(): AppConfig {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.message}`);
  }
  const data = parsed.data;
  const isProd = data.NODE_ENV === "production";
  if (isProd && !data.SETUP_BOOTSTRAP_SECRET) {
    throw new Error(
      "SETUP_BOOTSTRAP_SECRET (min 32 chars) is required when NODE_ENV=production — protects first-time /api/v1/setup/initialize",
    );
  }
  return {
    ...data,
    TRUST_PROXY: data.TRUST_PROXY || isProd,
    ALLOW_PUBLIC_SETUP_STATUS: data.ALLOW_PUBLIC_SETUP_STATUS ?? !isProd,
    INVALIDATE_OTHER_SESSIONS_ON_LOGIN: data.INVALIDATE_OTHER_SESSIONS_ON_LOGIN ?? isProd,
  };
}
