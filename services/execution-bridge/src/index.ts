// ============================================================
// OLYMP Execution Bridge — Main Service
// 
// Runs on GMK. Listens for execution requests from agents
// via Supabase Realtime, validates them, executes them
// (git commit/push), and reports results back to the War Room.
// ============================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './config.js';
import { validateExecution } from './validator.js';
import { GitExecutor } from './git-executor.js';
import { WarRoomNotifier } from './notifier.js';
import type { CodeCommitPayload, ExecutionQueueItem, ExecutionResult } from './types.js';

class ExecutionBridge {
  private supabase: SupabaseClient;
  private gitExecutor: GitExecutor;
  private notifier: WarRoomNotifier;
  private processing = false;

  constructor() {
    this.supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
    this.gitExecutor = new GitExecutor();
    this.notifier = new WarRoomNotifier();
  }

  /**
   * Start the bridge — subscribe to Realtime + poll as fallback
   */
  async start(): Promise<void> {
    console.log('============================================');
    console.log('  OLYMP Execution Bridge v1.0.0');
    console.log('============================================');
    console.log(`  Repo: ${config.repoPath}`);
    console.log(`  Supabase: ${config.supabaseUrl}`);
    console.log(`  Allowed types: ${config.allowedExecutionTypes.join(', ')}`);
    console.log(`  Poll interval: ${config.pollIntervalMs}ms`);
    console.log('============================================\n');

    // Process any pending items from before we started
    await this.processPendingItems();

    // Subscribe to Realtime for immediate processing
    this.subscribeToQueue();

    // Fallback: poll every N seconds in case Realtime misses something
    setInterval(() => this.processPendingItems(), config.pollIntervalMs);

    console.log('[Bridge] Running. Waiting for execution requests...\n');
  }

  /**
   * Subscribe to Supabase Realtime for instant processing
   */
  private subscribeToQueue(): void {
    this.supabase
      .channel('execution-queue')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'execution_queue',
          filter: 'status=eq.pending',
        },
        (payload) => {
          console.log(`[Realtime] New execution request: ${payload.new.id}`);
          this.processPendingItems();
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime] Subscription status: ${status}`);
      });
  }

  /**
   * Fetch and process all pending items
   */
  private async processPendingItems(): Promise<void> {
    // Prevent concurrent processing
    if (this.processing) return;
    this.processing = true;

    try {
      const { data: items, error } = await this.supabase
        .from('execution_queue')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(5);

      if (error) {
        console.error('[Bridge] Error fetching queue:', error.message);
        return;
      }

      if (!items || items.length === 0) return;

      console.log(`[Bridge] Processing ${items.length} pending item(s)...`);

      for (const item of items as ExecutionQueueItem[]) {
        await this.processItem(item);
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * Process a single execution queue item
   */
  private async processItem(item: ExecutionQueueItem): Promise<void> {
    console.log(`\n[Bridge] Processing: ${item.id}`);
    console.log(`  Type: ${item.execution_type}`);
    console.log(`  From: ${item.requested_by}`);

    // Mark as processing
    await this.updateStatus(item.id, 'processing');

    // Validate
    const validation = validateExecution(item);
    if (!validation.valid) {
      console.log(`  ❌ Rejected: ${validation.reason}`);
      await this.updateStatus(item.id, 'rejected', {
        error: validation.reason,
        executed_at: new Date().toISOString(),
      });
      await this.notifier.notifyRejection(item, validation.reason!);
      return;
    }

    // Execute based on type
    let result: ExecutionResult;

    switch (item.execution_type) {
      case 'code_commit':
        result = await this.gitExecutor.executeCodeCommit(
          item.payload as CodeCommitPayload
        );
        break;

      default:
        result = {
          success: false,
          error: `Unsupported execution type: ${item.execution_type}`,
          executed_at: new Date().toISOString(),
        };
    }

    // Update status
    const newStatus = result.success ? 'success' : 'failed';
    const attempts = item.attempts + 1;

    await this.updateStatus(item.id, newStatus, result, attempts);

    // Notify War Room
    const notifyItem = { ...item, attempts };
    await this.notifier.notify(notifyItem, result);

    // Log
    if (result.success) {
      console.log(`  ✅ Success: ${result.commit_sha} → ${result.branch}`);
    } else {
      console.log(`  ❌ Failed: ${result.error}`);
      
      // Retry if under max attempts
      if (attempts < item.max_attempts) {
        console.log(`  ⏳ Will retry (${attempts}/${item.max_attempts})`);
        await this.updateStatus(item.id, 'pending', result, attempts);
      }
    }
  }

  /**
   * Update execution queue item status
   */
  private async updateStatus(
    id: string,
    status: string,
    result?: Record<string, unknown> | ExecutionResult,
    attempts?: number
  ): Promise<void> {
    const update: Record<string, unknown> = { status };
    
    if (result) update.result = result;
    if (attempts !== undefined) update.attempts = attempts;
    if (status === 'processing') update.started_at = new Date().toISOString();
    if (['success', 'failed', 'rejected'].includes(status)) {
      update.completed_at = new Date().toISOString();
    }

    const { error } = await this.supabase
      .from('execution_queue')
      .update(update)
      .eq('id', id);

    if (error) {
      console.error(`[Bridge] Failed to update status for ${id}:`, error.message);
    }
  }
}

// ============================================================
// Start the service
// ============================================================

const bridge = new ExecutionBridge();
bridge.start().catch((err) => {
  console.error('[Bridge] Fatal error:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Bridge] Shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[Bridge] Shutting down...');
  process.exit(0);
});
