import { z } from 'zod';
import { readStored } from '../../lib/storage';

export const preferenceSchema = z.object({
  theme: z.enum(['paper', 'midnight', 'forest', 'classic']).default('paper'),
  font: z.enum(['serif', 'sans']).default('serif'),
  fontSize: z.number().min(14).max(32).default(20),
  lineHeight: z.number().min(1.3).max(2.2).default(1.8),
  reducedMotion: z.boolean().default(false),
  pageWidth: z.number().int().min(320).max(1200).default(720),
  margin: z.number().int().min(8).max(80).default(24),
  layout: z.enum(['paginated', 'scroll', 'spread']).default('paginated'),
  ttsRate: z.number().min(0.75).max(1.5).default(1),
});
export const defaultPreferences = preferenceSchema.parse({});
export function loadPreferences(key: string) {
  return (
    preferenceSchema.safeParse(
      readStored<unknown>(key, {}, (value): value is unknown => value !== undefined),
    ).data ?? defaultPreferences
  );
}
