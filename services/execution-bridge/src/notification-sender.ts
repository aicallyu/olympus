// ============================================================
// OLYMP Notification Sender — Sends WhatsApp notifications using Baileys
// from notification_queue to human participants
// ============================================================

import { SupabaseClient } from '@supabase/supabase-js';
import { WhatsAppClient } from './whatsapp-client.js';

interface NotificationQueueItem {
  id: string;
  message_id: string;
  room_id: string;
  recipient_phone: string;
  recipient_name: string;
  message_preview: string;
  sender_name: string;
  sent_at: string | null;
  created_at: string;
}

export class NotificationSender {
  private supabase: SupabaseClient;
  private whatsapp: WhatsAppClient;
  private processing = false;
  private adminPhone: string;
  private qrSent = false;

  constructor(supabase: SupabaseClient, adminPhone = '+593991656682') {
    this.supabase = supabase;
    this.adminPhone = adminPhone;
    
    // Initialize WhatsApp with QR callback
    this.whatsapp = new WhatsAppClient(
      './auth/whatsapp',
      './auth/whatsapp-qr.png',
      (qrPath) => this.handleQRGenerated(qrPath)
    );
  }

  /**
   * Handle QR code generation - send to admin
   */
  private async handleQRGenerated(qrPath: string): Promise<void> {
    if (this.qrSent) return; // Only send once
    
    console.log(`[Notifications] QR code generated at ${qrPath}`);
    console.log('[Notifications] QR code will be sent to admin once WhatsApp is connected');
    
    // Store that QR is ready - we'll send it when connected
    this.qrSent = true;
  }

  /**
   * Start polling for notifications
   */
  start(): void {
    console.log('[Notifications] Starting notification sender...');
    
    // Initialize WhatsApp connection
    this.whatsapp.initialize().catch(err => {
      console.error('[Notifications] WhatsApp init failed:', err);
    });
    
    // Poll every 30 seconds for notifications
    setInterval(() => this.processNotifications(), 30000);
    
    // Process immediately on start (after short delay for WhatsApp to connect)
    setTimeout(() => this.processNotifications(), 10000);
    
    // Check for QR code and send to admin periodically (before connection)
    setInterval(() => this.sendQRToAdmin(), 10000);
  }

  /**
   * Check if WhatsApp is ready
   */
  isWhatsAppReady(): boolean {
    return this.whatsapp.isReady();
  }

  /**
   * Send QR code image to admin if available
   */
  private async sendQRToAdmin(): Promise<void> {
    if (!this.whatsapp.hasQRImage() || this.whatsapp.isReady()) return;
    
    // Check if we already have a pending QR notification
    const { data: existing } = await this.supabase
      .from('notification_queue')
      .select('*')
      .eq('recipient_phone', this.adminPhone)
      .eq('sender_name', 'SYSTEM')
      .ilike('message_preview', '%QR code%')
      .is('sent_at', null)
      .limit(1);
    
    if (existing && existing.length > 0) {
      return; // Already have pending QR notification
    }
    
    // Insert QR notification
    await this.supabase.from('notification_queue').insert({
      message_id: 'qr-code-setup',
      room_id: '00000000-0000-0000-0000-000000000000',
      recipient_phone: this.adminPhone,
      recipient_name: 'Admin',
      message_preview: '📱 WhatsApp QR code ready for scanning. Check server: /home/onioko/olympus/services/execution-bridge/auth/whatsapp-qr.png',
      sender_name: 'SYSTEM',
      status: 'pending',
    });
  }

  /**
   * Process pending notifications
   */
  private async processNotifications(): Promise<void> {
    if (this.processing) return;
    
    // Check if WhatsApp is ready
    if (!this.whatsapp.isReady()) {
      console.log('[Notifications] WhatsApp not ready yet, skipping...');
      return;
    }
    
    this.processing = true;

    try {
      const { data: notifications, error } = await this.supabase
        .from('notification_queue')
        .select('*')
        .is('sent_at', null)
        .order('created_at', { ascending: true })
        .limit(5);

      if (error) {
        console.error('[Notifications] Error fetching queue:', error.message);
        return;
      }

      if (!notifications || notifications.length === 0) return;

      console.log(`[Notifications] Processing ${notifications.length} pending notification(s)...`);

      for (const notif of notifications as NotificationQueueItem[]) {
        await this.sendNotification(notif);
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * Send a single notification via WhatsApp using Baileys
   */
  private async sendNotification(notif: NotificationQueueItem): Promise<void> {
    try {
      const formattedMessage = `🔔 *${notif.sender_name}* (War Room):\n${notif.message_preview}`;
      
      console.log(`[Notifications] Sending to ${notif.recipient_name} (${notif.recipient_phone})...`);

      // Send via WhatsApp
      const sent = await this.whatsapp.sendMessage(notif.recipient_phone, formattedMessage);

      if (!sent) {
        console.error(`[Notifications] Failed to send to ${notif.recipient_name}`);
        return;
      }

      // Mark as sent
      const { error } = await this.supabase
        .from('notification_queue')
        .update({ sent_at: new Date().toISOString() })
        .eq('id', notif.id);

      if (error) {
        console.error(`[Notifications] Failed to mark ${notif.id} as sent:`, error.message);
      } else {
        console.log(`[Notifications] ✅ Sent and marked as sent: ${notif.recipient_name}`);
      }
    } catch (err) {
      console.error(`[Notifications] Failed to send to ${notif.recipient_name}:`, err);
    }
  }
}
