try {
  process.loadEnvFile();
} catch {
  // .env is optional; defaults below apply.
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? '0.0.0.0',
  jwtSecret: process.env.JWT_SECRET ?? 'gamezone-dev-secret',
  tokenTtl: '12h',
} as const;
