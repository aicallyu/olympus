// ============================================================
// OLYMP Execution Bridge — War Room Notifier
// Posts execution results back into the War Room chat
// so the team sees what happened.
// ============================================================
import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';
export class WarRoomNotifier {
    supabase;
    constructor() {
        this.supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
    }
    /**
     * Post a status message to the War Room
     */
    async notify(item, result) {
        if (!item.room_id)
            return;
        const message = result.success
            ? this.formatSuccess(item, result)
            : this.formatFailure(item, result);
        try {
            const { error } = await this.supabase.from('war_room_messages').insert({
                room_id: item.room_id,
                sender_type: 'system',
                sender_name: 'EXECUTION BRIDGE',
                content: message,
                metadata: {
                    execution_id: item.id,
                    execution_result: result,
                    is_system_message: true,
                },
            });
            if (error) {
                console.error('[Notifier] Failed to post to War Room:', error.message);
            }
        }
        catch (err) {
            console.error('[Notifier] Error:', err);
        }
    }
    formatSuccess(item, result) {
        const files = 'files' in item.payload
            ? item.payload.files
            : [];
        const fileList = files
            .map((f) => `  • ${f.path}`)
            .join('\n');
        return [
            `✅ **Execution erfolgreich**`,
            ``,
            `**Agent:** ${item.requested_by}`,
            `**Typ:** ${item.execution_type}`,
            `**Branch:** ${result.branch || 'n/a'}`,
            `**Commit:** \`${result.commit_sha || 'n/a'}\``,
            ``,
            `**Dateien:**`,
            fileList,
            ``,
            result.branch === 'main'
                ? `🚀 Auto-deployed to ${result.deploy_url}`
                : `📋 Branch \`${result.branch}\` ready for PR → main`,
        ].join('\n');
    }
    formatFailure(item, result) {
        return [
            `❌ **Execution fehlgeschlagen**`,
            ``,
            `**Agent:** ${item.requested_by}`,
            `**Typ:** ${item.execution_type}`,
            `**Fehler:** ${result.error}`,
            ``,
            `**Versuch:** ${item.attempts}/${item.max_attempts}`,
            item.attempts < item.max_attempts
                ? `⏳ Nächster Versuch in Kürze...`
                : `🛑 Maximale Versuche erreicht. Manuelles Eingreifen nötig.`,
        ].join('\n');
    }
    /**
     * Post a rejection notice
     */
    async notifyRejection(item, reason) {
        if (!item.room_id)
            return;
        const message = [
            `⚠️ **Execution abgelehnt**`,
            ``,
            `**Agent:** ${item.requested_by}`,
            `**Grund:** ${reason}`,
            ``,
            `Der Agent muss den Request korrigieren und erneut senden.`,
        ].join('\n');
        try {
            await this.supabase.from('war_room_messages').insert({
                room_id: item.room_id,
                sender_type: 'system',
                sender_name: 'EXECUTION BRIDGE',
                content: message,
                metadata: {
                    execution_id: item.id,
                    is_system_message: true,
                    rejection_reason: reason,
                },
            });
        }
        catch (err) {
            console.error('[Notifier] Error posting rejection:', err);
        }
    }
}
//# sourceMappingURL=notifier.js.map