// ============================================================
// OLYMP Execution Bridge — Configuration
// ============================================================
import 'dotenv/config';
function requireEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}
export const config = {
    supabaseUrl: requireEnv('SUPABASE_URL'),
    supabaseServiceKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    repoPath: process.env.REPO_PATH || '/home/argos/olympus',
    pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || '5000', 10),
    allowedExecutionTypes: (process.env.ALLOWED_TYPES || 'code_commit').split(','),
    // Safety: 500KB max file size per file
    maxFileSizeBytes: parseInt(process.env.MAX_FILE_SIZE || '512000', 10),
    // Safety: never let agents write to these paths
    blockedPaths: [
        '.env',
        '.env.local',
        '.env.production',
        'package-lock.json',
        '.git/',
        '.github/workflows/',
        'node_modules/',
        // Supabase secrets
        'supabase/.env',
        'supabase/config.toml',
    ],
};
//# sourceMappingURL=config.js.map