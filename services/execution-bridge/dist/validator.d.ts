import type { ExecutionQueueItem } from './types.js';
export interface ValidationResult {
    valid: boolean;
    reason?: string;
}
/**
 * Main validation entry point
 */
export declare function validateExecution(item: ExecutionQueueItem): ValidationResult;
