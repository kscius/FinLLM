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
  return {
    ...data,
    TRUST_PROXY: data.TRUST_PROXY || data.NODE_ENV === "production",
  };
}
