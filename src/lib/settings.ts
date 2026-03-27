/**
 * Settings are stored encrypted in the DB.
 * Fallback: env vars (useful when DB is unavailable in local dev).
 */
import crypto from 'crypto';
import type { AppSettings, SafeSettings, LLMProvider, ImageProvider } from './types';

const SETTINGS_ID = 'singleton';

// AES-256-GCM format: "aes:" + hex(iv[16]) + hex(authTag[16]) + hex(ciphertext)
// Legacy XOR format: raw base64 (no "aes:" prefix) — decrypted for migration only
const AES_PREFIX = 'aes:';

function deriveKey(): Buffer {
  const raw = process.env.SETTINGS_ENCRYPTION_KEY ?? 'default-insecure-key-change-me!!';
  // Pad/truncate to exactly 32 bytes for AES-256
  return Buffer.concat([Buffer.from(raw, 'utf8'), Buffer.alloc(32)]).slice(0, 32);
}

function encrypt(text: string): string {
  const key = deriveKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return AES_PREFIX + iv.toString('hex') + authTag.toString('hex') + encrypted.toString('hex');
}

function decrypt(encoded: string): string {
  if (encoded.startsWith(AES_PREFIX)) {
    // AES-256-GCM path
    const hex = encoded.slice(AES_PREFIX.length);
    const iv = Buffer.from(hex.slice(0, 32), 'hex');
    const authTag = Buffer.from(hex.slice(32, 64), 'hex');
    const ciphertext = Buffer.from(hex.slice(64), 'hex');
    const key = deriveKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  }
  // Legacy XOR path — used only during migration from old format
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
    llmProvider:       (process.env.LLM_PROVIDER as LLMProvider) ?? 'openai',
    imageProvider:     'gemini',
    openaiApiKey:      process.env.OPENAI_API_KEY,
    anthropicApiKey:   process.env.ANTHROPIC_API_KEY,
    googleApiKey:      process.env.GOOGLE_API_KEY,
    openaiModel:       process.env.OPENAI_MODEL      ?? 'gpt-4o',
    anthropicModel:    process.env.ANTHROPIC_MODEL   ?? 'claude-sonnet-4-6',
    geminiLlmModel:    process.env.GEMINI_LLM_MODEL  ?? 'gemini-2.5-flash',
    geminiImageModel:  process.env.GEMINI_IMAGE_MODEL ?? 'gemini-3.1-flash-image-preview',
    imageSize:         process.env.IMAGE_SIZE         ?? '1024x1024',
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
      const isLegacy = !record.data.startsWith(AES_PREFIX);
      const dbSettings = JSON.parse(decrypt(record.data)) as AppSettings;
      // Migrate legacy XOR-encrypted data to AES on first read
      if (isLegacy) {
        const { prisma: p } = await import('./prisma');
        await p.settings.update({
          where: { id: SETTINGS_ID },
          data: { data: encrypt(JSON.stringify(dbSettings)) },
        });
      }
      // Merge: env vars fill in any keys not saved in DB yet
      return {
        ...envDefaults(),
        ...dbSettings,
        // Always prefer DB values for API keys if they exist, else fall back to env
        googleApiKey:    dbSettings.googleApiKey    ?? process.env.GOOGLE_API_KEY,
        openaiApiKey:    dbSettings.openaiApiKey    ?? process.env.OPENAI_API_KEY,
        anthropicApiKey: dbSettings.anthropicApiKey ?? process.env.ANTHROPIC_API_KEY,
        imageProvider:   'gemini',
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
    googleApiKey,
    ...rest
  } = s;
  return {
    ...rest,
    hasOpenaiKey:    !!openaiApiKey,
    hasAnthropicKey: !!anthropicApiKey,
    hasGoogleKey:    !!googleApiKey,
  };
}
