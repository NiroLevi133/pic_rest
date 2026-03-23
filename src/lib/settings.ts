/**
 * Settings are stored encrypted in the DB.
 * Fallback: env vars (useful when DB is unavailable in local dev).
 */
import type { AppSettings, SafeSettings, LLMProvider, ImageProvider } from './types';

const SETTINGS_ID = 'singleton';

// Simple XOR + base64 "encryption" for MVP (replace with AES in production)
function encrypt(text: string): string {
  const key = process.env.SETTINGS_ENCRYPTION_KEY ?? 'default-insecure-key-change-me!!';
  const keyBytes = Buffer.from(key);
  const inputBytes = Buffer.from(text, 'utf8');
  const result = Buffer.alloc(inputBytes.length);
  for (let i = 0; i < inputBytes.length; i++) {
    result[i] = inputBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  return result.toString('base64');
}

function decrypt(encoded: string): string {
  const key = process.env.SETTINGS_ENCRYPTION_KEY ?? 'default-insecure-key-change-me!!';
  const keyBytes = Buffer.from(key);
  const inputBytes = Buffer.from(encoded, 'base64');
  const result = Buffer.alloc(inputBytes.length);
  for (let i = 0; i < inputBytes.length; i++) {
    result[i] = inputBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  return result.toString('utf8');
}

/** Defaults built from env vars – used when DB is unreachable */
function envDefaults(): AppSettings {
  return {
    llmProvider:       (process.env.LLM_PROVIDER as LLMProvider)     ?? 'gemini',
    imageProvider:     (process.env.IMAGE_PROVIDER as ImageProvider)  ?? 'gemini',
    openaiApiKey:      process.env.OPENAI_API_KEY,
    anthropicApiKey:   process.env.ANTHROPIC_API_KEY,
    googleApiKey:      process.env.GOOGLE_API_KEY,
    stabilityApiKey:   process.env.STABILITY_API_KEY,
    replicateApiKey:   process.env.REPLICATE_API_KEY,
    openaiModel:       process.env.OPENAI_MODEL       ?? 'gpt-4o',
    anthropicModel:    process.env.ANTHROPIC_MODEL    ?? 'claude-sonnet-4-6',
    geminiLlmModel:    process.env.GEMINI_LLM_MODEL   ?? 'gemini-2.5-flash',
    geminiImageModel:  process.env.GEMINI_IMAGE_MODEL ?? 'gemini-3.1-flash-image-preview',
    dalleModel:        process.env.DALLE_MODEL        ?? 'dall-e-3',
    imageSize:         process.env.IMAGE_SIZE         ?? '1024x1024',
    imageStyle:        process.env.IMAGE_STYLE        ?? 'vivid',
    imageQuality:      process.env.IMAGE_QUALITY      ?? 'medium',
    concurrency:       Number(process.env.CONCURRENCY ?? 3),
  };
}

export async function getSettings(): Promise<AppSettings> {
  try {
    const { prisma } = await import('./prisma');
    const record = await prisma.settings.findUnique({ where: { id: SETTINGS_ID } });
    if (!record) return envDefaults();
    try {
      const dbSettings = JSON.parse(decrypt(record.data)) as AppSettings;
      // Merge: env vars fill in any keys not saved in DB yet
      return {
        ...envDefaults(),
        ...dbSettings,
        // Always prefer DB values for API keys if they exist, else fall back to env
        googleApiKey:    dbSettings.googleApiKey    ?? process.env.GOOGLE_API_KEY,
        openaiApiKey:    dbSettings.openaiApiKey    ?? process.env.OPENAI_API_KEY,
        anthropicApiKey: dbSettings.anthropicApiKey ?? process.env.ANTHROPIC_API_KEY,
        stabilityApiKey: dbSettings.stabilityApiKey ?? process.env.STABILITY_API_KEY,
        replicateApiKey: dbSettings.replicateApiKey ?? process.env.REPLICATE_API_KEY,
      };
    } catch {
      return envDefaults();
    }
  } catch {
    // DB unreachable – use env vars only
    console.warn('[settings] DB unavailable, using env var fallback');
    return envDefaults();
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const { prisma } = await import('./prisma');
  const encrypted = encrypt(JSON.stringify(settings));
  await prisma.settings.upsert({
    where: { id: SETTINGS_ID },
    update: { data: encrypted },
    create: { id: SETTINGS_ID, data: encrypted },
  });
}

export function toSafeSettings(s: AppSettings): SafeSettings {
  const {
    openaiApiKey,
    anthropicApiKey,
    stabilityApiKey,
    replicateApiKey,
    googleApiKey,
    ...rest
  } = s;
  return {
    ...rest,
    hasOpenaiKey:    !!openaiApiKey,
    hasAnthropicKey: !!anthropicApiKey,
    hasStabilityKey: !!stabilityApiKey,
    hasReplicateKey: !!replicateApiKey,
    hasGoogleKey:    !!googleApiKey,
  };
}
