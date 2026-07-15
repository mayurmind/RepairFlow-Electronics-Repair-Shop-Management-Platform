import { z } from "zod";

export const environmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.string().transform(Number).default("4000"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  WEB_APP_URL: z.string().url("WEB_APP_URL must be a valid URL").optional(),
  CORS_ALLOWED_ORIGINS: z.string().optional(),

  JWT_ACCESS_SECRET: z
    .string()
    .min(
      32,
      "JWT_ACCESS_SECRET must be at least 32 characters long. Placeholder values are not allowed in production.",
    )
    .refine(
      (val) => {
        if (process.env.NODE_ENV !== "production") return true;
        return (
          !val.includes("dev") &&
          !val.includes("example") &&
          !val.includes("change-me")
        );
      },
      {
        message:
          'Production secrets must not contain "dev", "example", or "change-me"',
      },
    ),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SECURE: z.enum(["true", "false"]).default("true"),
  COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),

  LOG_LEVEL: z
    .enum(["error", "warn", "info", "debug", "verbose"])
    .default("info"),
});

export type EnvironmentConfig = z.infer<typeof environmentSchema>;

export function validateEnvironment() {
  // Allow weaker secrets in non-production environments
  if (process.env.NODE_ENV !== "production" && !process.env.JWT_ACCESS_SECRET) {
    process.env.JWT_ACCESS_SECRET =
      "dev_jwt_access_secret_key_which_must_be_very_long_and_secure_12345";
  }

  const parsed = environmentSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("❌ Invalid environment configuration:");
    parsed.error.issues.forEach((issue) => {
      console.error(`  - [${issue.path.join(".")}] : ${issue.message}`);
    });

    // Fail hard
    if (process.env.NODE_ENV !== "test" && !process.env.SKIP_ENV_VALIDATION) {
      process.exit(1);
    }
  }

  return parsed.data;
}
