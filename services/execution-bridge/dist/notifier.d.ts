import type { ExecutionQueueItem, ExecutionResult } from './types.js';
export declare class WarRoomNotifier {
    private supabase;
    constructor();
    /**
     * Post a status message to the War Room
     */
    notify(item: ExecutionQueueItem, result: ExecutionResult): Promise<void>;
    private formatSuccess;
    private formatFailure;
    /**
     * Post a rejection notice
     */
    notifyRejection(item: ExecutionQueueItem, reason: string): Promise<void>;
}
