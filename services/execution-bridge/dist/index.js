// ============================================================
// OLYMP Execution Bridge — Main Service
// 
// Runs on GMK. Listens for execution requests from agents
// via Supabase Realtime, validates them, executes them
// (git commit/push), and reports results back to the War Room.
// ============================================================
import { createClient } from '@supabase/supabase-js';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { config } from './config.js';
import { validateExecution } from './validator.js';
import { GitExecutor } from './git-executor.js';
import { WarRoomNotifier } from './notifier.js';
import { NotificationSender } from './notification-sender.js';
const HTTP_PORT = parseInt(process.env.HTTP_PORT || '3456', 10);
const QR_PATH = './auth/whatsapp-qr.png';
class ExecutionBridge {
    supabase;
    gitExecutor;
    notifier;
    notificationSender;
    processing = false;
    constructor() {
        this.supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
        this.gitExecutor = new GitExecutor();
        this.notifier = new WarRoomNotifier();
        this.notificationSender = new NotificationSender(this.supabase);
    }
    /**
     * Start the bridge — subscribe to Realtime + poll as fallback
     */
    async start() {
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
        // Start HTTP server for QR code and status
        this.startHttpServer();
        // Start notification sender for WhatsApp alerts
        this.notificationSender.start();
    }
    /**
     * Start HTTP server to serve QR code and status
     */
    startHttpServer() {
        const server = createServer((req, res) => {
            const url = req.url || '/';
            // CORS headers
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET');
            if (url === '/qr' || url === '/whatsapp-qr.png') {
                // Serve QR code image
                if (existsSync(QR_PATH)) {
                    try {
                        const image = readFileSync(QR_PATH);
                        res.writeHead(200, { 'Content-Type': 'image/png' });
                        res.end(image);
                    }
                    catch (err) {
                        res.writeHead(500, { 'Content-Type': 'text/plain' });
                        res.end('Error reading QR code');
                    }
                }
                else {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('QR code not found. Bridge may not be ready yet.');
                }
            }
            else if (url === '/status' || url === '/health') {
                // Status endpoint
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    status: 'running',
                    whatsapp: this.notificationSender.isWhatsAppReady() ? 'connected' : 'waiting',
                    qrAvailable: existsSync(QR_PATH),
                    qrUrl: `http://${this.getIpAddress()}:${HTTP_PORT}/qr`
                }, null, 2));
            }
            else {
                // Main page with instructions
                const ip = this.getIpAddress();
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(`<!DOCTYPE html>
<html>
<head>
  <title>OLYMP Bridge</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: system-ui, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; background: #1a1a1a; color: #fff; }
    h1 { color: #00d4aa; }
    .qr { background: #fff; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
    .qr img { max-width: 100%; height: auto; }
    .instructions { background: #2a2a2a; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .instructions ol { line-height: 1.8; }
    code { background: #333; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
    .status { padding: 10px 20px; border-radius: 4px; display: inline-block; }
    .status.waiting { background: #f0a500; color: #000; }
    .status.connected { background: #00d4aa; color: #000; }
  </style>
</head>
<body>
  <h1>🔱 OLYMP Execution Bridge</h1>
  
  <div class="qr">
    <h2>WhatsApp QR Code</h2>
    ${existsSync(QR_PATH) ? `<img src="/qr" alt="WhatsApp QR Code">` : '<p>QR Code wird generiert...</p>'}
  </div>

  <div class="instructions">
    <h3>📱 So verknüpfst du WhatsApp:</h3>
    <ol>
      <li>Öffne WhatsApp auf deinem Handy</li>
      <li>Gehe zu <strong>Einstellungen → Verknüpfte Geräte</strong></li>
      <li>Tippe auf <strong>Gerät verknüpfen</strong></li>
      <li>Scanne den QR-Code oben</li>
    </ol>
  </div>

  <div class="instructions">
    <h3>🔗 Direktlinks:</h3>
    <ul>
      <li>QR Code: <code>http://${ip}:${HTTP_PORT}/qr</code></li>
      <li>Status: <code>http://${ip}:${HTTP_PORT}/status</code></li>
    </ul>
  </div>

  <p style="text-align: center; margin-top: 40px; color: #666;">
    OLYMP Execution Bridge v1.0.0
  </p>
</body>
</html>`);
            }
        });
        server.listen(HTTP_PORT, () => {
            const ip = this.getIpAddress();
            console.log(`[HTTP] Server running on http://${ip}:${HTTP_PORT}`);
            console.log(`[HTTP] QR Code: http://${ip}:${HTTP_PORT}/qr`);
            console.log(`[HTTP] Status: http://${ip}:${HTTP_PORT}/status\n`);
        });
    }
    /**
     * Get IP address for display
     */
    getIpAddress() {
        // Use environment variable or default to localhost
        return process.env.BRIDGE_HOST || '100.82.20.112';
    }
    /**
     * Subscribe to Supabase Realtime for instant processing
     */
    subscribeToQueue() {
        this.supabase
            .channel('execution-queue')
            .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'execution_queue',
            filter: 'status=eq.pending',
        }, (payload) => {
            console.log(`[Realtime] New execution request: ${payload.new.id}`);
            this.processPendingItems();
        })
            .subscribe((status) => {
            console.log(`[Realtime] Subscription status: ${status}`);
        });
    }
    /**
     * Fetch and process all pending items
     */
    async processPendingItems() {
        // Prevent concurrent processing
        if (this.processing)
            return;
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
            if (!items || items.length === 0)
                return;
            console.log(`[Bridge] Processing ${items.length} pending item(s)...`);
            for (const item of items) {
                await this.processItem(item);
            }
        }
        finally {
            this.processing = false;
        }
    }
    /**
     * Process a single execution queue item
     */
    async processItem(item) {
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
            await this.notifier.notifyRejection(item, validation.reason);
            return;
        }
        // Execute based on type
        let result;
        switch (item.execution_type) {
            case 'code_commit':
                result = await this.gitExecutor.executeCodeCommit(item.payload);
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
        }
        else {
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
    async updateStatus(id, status, result, attempts) {
        const update = { status };
        if (result)
            update.result = result;
        if (attempts !== undefined)
            update.attempts = attempts;
        if (status === 'processing')
            update.started_at = new Date().toISOString();
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
//# sourceMappingURL=index.js.map