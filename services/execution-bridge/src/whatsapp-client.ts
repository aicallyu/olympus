// ============================================================
// OLYMP WhatsApp Client — Uses Baileys for direct WhatsApp Web connection
// ============================================================

import { 
  makeWASocket, 
  DisconnectReason, 
  useMultiFileAuthState,
  WASocket,
  ConnectionState
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import QRCode from 'qrcode';
import * as fs from 'fs';
import * as path from 'path';

export class WhatsAppClient {
  private sock: WASocket | null = null;
  private authPath: string;
  private qrPath: string;
  private isConnected = false;
  private isConnecting = false;
  private onQRGenerated?: (qrPath: string) => void;

  constructor(authPath = './auth/whatsapp', qrPath = './auth/whatsapp-qr.png', onQRGenerated?: (qrPath: string) => void) {
    this.authPath = authPath;
    this.qrPath = qrPath;
    this.onQRGenerated = onQRGenerated;
    this.ensureAuthDir();
  }

  private ensureAuthDir(): void {
    if (!fs.existsSync(this.authPath)) {
      fs.mkdirSync(this.authPath, { recursive: true });
    }
  }

  /**
   * Initialize WhatsApp connection
   */
  async initialize(): Promise<void> {
    if (this.isConnecting || this.isConnected) {
      console.log('[WhatsApp] Already connecting or connected');
      return;
    }

    this.isConnecting = true;
    console.log('[WhatsApp] Initializing connection...');

    try {
      const { state, saveCreds } = await useMultiFileAuthState(this.authPath);

      this.sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        browser: ['OLYMP Bridge', 'Desktop', '1.0.0'],
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 30000,
      });

      // Handle connection updates
      this.sock.ev.on('connection.update', (update: Partial<ConnectionState>) => {
        this.handleConnectionUpdate(update);
      });

      // Handle credentials update
      this.sock.ev.on('creds.update', saveCreds);

      // Handle messages (for logging)
      this.sock.ev.on('messages.upsert', (m) => {
        if (m.type === 'notify') {
          console.log(`[WhatsApp] Received message from ${m.messages[0]?.key?.remoteJid}`);
        }
      });

    } catch (err) {
      console.error('[WhatsApp] Failed to initialize:', err);
      this.isConnecting = false;
      throw err;
    }
  }

  /**
   * Handle connection state changes
   */
  private handleConnectionUpdate(update: Partial<ConnectionState>): void {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n[WhatsApp] Scan this QR code to connect:');
      qrcode.generate(qr, { small: true });
      console.log('\n');
      
      // Save QR code as image
      this.saveQRCodeImage(qr);
    }

    if (connection === 'close') {
      this.isConnected = false;
      this.isConnecting = false;
      
      const shouldReconnect = (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;
      
      console.log('[WhatsApp] Connection closed due to:', lastDisconnect?.error?.message || 'unknown');
      
      if (shouldReconnect) {
        console.log('[WhatsApp] Reconnecting in 5 seconds...');
        setTimeout(() => this.initialize(), 5000);
      } else {
        console.log('[WhatsApp] Logged out, delete auth folder to re-scan QR');
      }
    } else if (connection === 'open') {
      this.isConnected = true;
      this.isConnecting = false;
      console.log('[WhatsApp] ✅ Connected successfully!');
      
      // Delete QR code image after successful connection
      if (fs.existsSync(this.qrPath)) {
        fs.unlinkSync(this.qrPath);
        console.log('[WhatsApp] QR code image deleted');
      }
    }
  }

  /**
   * Save QR code as PNG image
   */
  private async saveQRCodeImage(qrData: string): Promise<void> {
    try {
      await QRCode.toFile(this.qrPath, qrData, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      console.log(`[WhatsApp] QR code saved to: ${this.qrPath}`);
      
      // Notify callback if provided
      if (this.onQRGenerated) {
        this.onQRGenerated(this.qrPath);
      }
    } catch (err) {
      console.error('[WhatsApp] Failed to save QR code image:', err);
    }
  }

  /**
   * Get QR code image path
   */
  getQRPath(): string {
    return this.qrPath;
  }

  /**
   * Check if QR code image exists
   */
  hasQRImage(): boolean {
    return fs.existsSync(this.qrPath);
  }

  /**
   * Send a message to a phone number
   */
  async sendMessage(phoneNumber: string, message: string): Promise<boolean> {
    if (!this.isConnected || !this.sock) {
      console.error('[WhatsApp] Not connected');
      return false;
    }

    try {
      // Format phone number (remove + and ensure @s.whatsapp.net suffix)
      const jid = this.formatPhoneToJid(phoneNumber);
      
      console.log(`[WhatsApp] Sending to ${jid}...`);
      
      await this.sock.sendMessage(jid, { text: message });
      
      console.log(`[WhatsApp] ✅ Message sent to ${phoneNumber}`);
      return true;
    } catch (err) {
      console.error(`[WhatsApp] Failed to send to ${phoneNumber}:`, err);
      return false;
    }
  }

  /**
   * Send an image to a phone number
   */
  async sendImage(phoneNumber: string, imagePath: string, caption?: string): Promise<boolean> {
    if (!this.isConnected || !this.sock) {
      console.error('[WhatsApp] Not connected');
      return false;
    }

    try {
      const jid = this.formatPhoneToJid(phoneNumber);
      
      console.log(`[WhatsApp] Sending image to ${jid}...`);
      
      const imageBuffer = fs.readFileSync(imagePath);
      
      await this.sock.sendMessage(jid, {
        image: imageBuffer,
        caption: caption || '',
      });
      
      console.log(`[WhatsApp] ✅ Image sent to ${phoneNumber}`);
      return true;
    } catch (err) {
      console.error(`[WhatsApp] Failed to send image to ${phoneNumber}:`, err);
      return false;
    }
  }

  /**
   * Format phone number to WhatsApp JID
   */
  private formatPhoneToJid(phone: string): string {
    // Remove any non-numeric characters
    const cleanNumber = phone.replace(/\D/g, '');
    return `${cleanNumber}@s.whatsapp.net`;
  }

  /**
   * Check if connected
   */
  isReady(): boolean {
    return this.isConnected;
  }

  /**
   * Disconnect gracefully
   */
  async disconnect(): Promise<void> {
    if (this.sock) {
      await this.sock.logout();
      this.sock = null;
      this.isConnected = false;
      console.log('[WhatsApp] Disconnected');
    }
  }
}
