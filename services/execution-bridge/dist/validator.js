// ============================================================
// OLYMP Execution Bridge — Payload Validator
// Safety layer: validates and sanitizes agent payloads
// before any execution happens.
// ============================================================
import { config } from './config.js';
/**
 * Validate a file path is safe to write to
 */
function isPathSafe(filePath) {
    // Normalize path
    const normalized = filePath.replace(/\\/g, '/');
    // Block path traversal
    if (normalized.includes('..')) {
        return { valid: false, reason: `Path traversal detected: ${filePath}` };
    }
    // Block absolute paths
    if (normalized.startsWith('/')) {
        return { valid: false, reason: `Absolute path not allowed: ${filePath}` };
    }
    // Check against blocked paths
    for (const blocked of config.blockedPaths) {
        if (normalized.startsWith(blocked) || normalized === blocked) {
            return { valid: false, reason: `Blocked path: ${filePath}` };
        }
    }
    // Block executable files
    const dangerousExtensions = ['.sh', '.bash', '.zsh', '.bat', '.cmd', '.exe', '.bin'];
    if (dangerousExtensions.some(ext => normalized.endsWith(ext))) {
        return { valid: false, reason: `Executable file type not allowed: ${filePath}` };
    }
    return { valid: true };
}
/**
 * Validate a single file action
 */
function validateFile(file) {
    // Check path safety
    const pathCheck = isPathSafe(file.path);
    if (!pathCheck.valid)
        return pathCheck;
    // Check file size
    if (file.content && Buffer.byteLength(file.content, 'utf-8') > config.maxFileSizeBytes) {
        return {
            valid: false,
            reason: `File too large: ${file.path} (max ${config.maxFileSizeBytes} bytes)`,
        };
    }
    // Check action is valid
    if (!['create', 'update', 'delete'].includes(file.action)) {
        return { valid: false, reason: `Invalid action: ${file.action}` };
    }
    return { valid: true };
}
/**
 * Validate a code_commit payload
 */
function validateCodeCommit(payload) {
    if (!payload.files || !Array.isArray(payload.files) || payload.files.length === 0) {
        return { valid: false, reason: 'No files in payload' };
    }
    if (payload.files.length > 20) {
        return { valid: false, reason: `Too many files: ${payload.files.length} (max 20)` };
    }
    if (!payload.commit_message || payload.commit_message.length < 5) {
        return { valid: false, reason: 'Commit message too short or missing' };
    }
    if (!payload.branch || payload.branch.length < 3) {
        return { valid: false, reason: 'Branch name too short or missing' };
    }
    // Don't allow pushing directly to main
    if (payload.branch === 'main' || payload.branch === 'master') {
        return { valid: false, reason: 'Direct push to main/master not allowed. Use a feature branch.' };
    }
    // Validate each file
    for (const file of payload.files) {
        const fileCheck = validateFile(file);
        if (!fileCheck.valid)
            return fileCheck;
    }
    return { valid: true };
}
/**
 * Main validation entry point
 */
export function validateExecution(item) {
    // Check execution type is allowed
    if (!config.allowedExecutionTypes.includes(item.execution_type)) {
        return {
            valid: false,
            reason: `Execution type not allowed: ${item.execution_type}. Allowed: ${config.allowedExecutionTypes.join(', ')}`,
        };
    }
    switch (item.execution_type) {
        case 'code_commit':
            return validateCodeCommit(item.payload);
        case 'db_migration':
            // DB migrations disabled by default — too risky for auto-execution
            return { valid: false, reason: 'DB migrations require manual approval' };
        case 'edge_function':
            // Edge functions disabled by default
            return { valid: false, reason: 'Edge function deployment requires manual approval' };
        case 'shell_command':
            // Shell commands always rejected in auto mode
            return { valid: false, reason: 'Shell commands not allowed in automatic execution' };
        default:
            return { valid: false, reason: `Unknown execution type: ${item.execution_type}` };
    }
}
//# sourceMappingURL=validator.js.map