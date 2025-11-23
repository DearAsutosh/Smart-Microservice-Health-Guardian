/**
 * Notification Service
 * 
 * Sends critical alerts to mobile devices via:
 * - Telegram Bot (recommended)
 * - Email (fallback)
 * - Discord Webhook (alternative)
 * 
 * Features:
 * - Rate limiting (max 1 notification per service per 15 min)
 * - Severity filtering (only critical/warning)
 * - Rich message formatting
 */

import axios from 'axios';

// Optional: nodemailer (only needed for email notifications)
let nodemailer = null;
try {
  nodemailer = await import('nodemailer');
} catch (err) {
  console.log('⚠️  nodemailer not installed - email notifications disabled');
  console.log('   Run: npm install nodemailer (in backend directory)');
}

class NotificationService {
  constructor(config = {}) {
    this.config = config;
    this.lastNotificationTime = {}; // Track last notification per service
    this.rateLimitMinutes = 15;

    // Initialize Telegram if configured
    if (config.telegram?.botToken && config.telegram?.chatId) {
      this.telegramEnabled = true;
      this.telegramBotToken = config.telegram.botToken;
      this.telegramChatId = config.telegram.chatId;
      console.log('📱 Telegram notifications enabled');
    }

    // Initialize Email if configured
    if (config.email?.user && config.email?.pass && nodemailer) {
      this.emailEnabled = true;
      this.emailTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: config.email.user,
          pass: config.email.pass, // Use app-specific password
        },
      });
      this.emailTo = config.email.to || config.email.user;
      console.log('📧 Email notifications enabled');
    } else if (config.email?.user && !nodemailer) {
      console.log('⚠️  Email configured but nodemailer not installed');
    }

    // Initialize Discord if configured
    if (config.discord?.webhookUrl) {
      this.discordEnabled = true;
      this.discordWebhookUrl = config.discord.webhookUrl;
      console.log('💬 Discord notifications enabled');
    }

    if (!this.telegramEnabled && !this.emailEnabled && !this.discordEnabled) {
      console.log('⚠️  No notification channels configured. Notifications disabled.');
    }
  }

  /**
   * Check if we should send a notification (rate limiting)
   */
  shouldNotify(serviceName, status) {
    // Allow info notifications (startup/shutdown) without rate limiting
    if (status === 'info') {
      return true;
    }

    // Only notify for warning and critical
    if (status !== 'warning' && status !== 'critical' && status !== 'unhealthy' && status !== 'degraded') {
      return false;
    }

    // ALWAYS send critical/unhealthy alerts immediately (bypass rate limit)
    if (status === 'critical' || status === 'unhealthy') {
      console.log(`🚨 Critical alert for ${serviceName} - bypassing rate limit`);
      return true;
    }

    // Apply rate limiting only for warning/degraded states
    const now = Date.now();
    const lastTime = this.lastNotificationTime[serviceName] || 0;
    const minutesSinceLastNotification = (now - lastTime) / (1000 * 60);

    if (minutesSinceLastNotification < this.rateLimitMinutes) {
      console.log(`⏱️  Rate limit: Skipping notification for ${serviceName} (last sent ${minutesSinceLastNotification.toFixed(1)} min ago)`);
      return false;
    }

    return true;
  }

  /**
   * Format alert message
   */
  formatMessage(service, status, reason, metrics) {
    const emoji = {
      healthy: '🟢',
      warning: '🟡',
      degraded: '🟡',
      critical: '🔴',
      unhealthy: '🔴',
      info: '🔵',
      unknown: '⚪',
    };

    const statusEmoji = emoji[status] || '⚪';
    const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    // Special formatting for startup notification
    if (reason === '🚀 Service Started') {
      return {
        title: `${statusEmoji} ${service.name} Started`,
        body: `
🚀 **${service.name} is now online**

The service has successfully started and is sending heartbeats.

⏳ **Analyzing baseline for 1.5 minutes**
During this period, the system will learn normal behavior patterns before monitoring begins.

🕐 **Started at:** ${timestamp}
        `.trim(),
      };
    }

    // Special formatting for shutdown notification
    if (reason === '🛑 Service Stopped') {
      return {
        title: `${statusEmoji} ${service.name} Stopped`,
        body: `
🛑 **${service.name} has stopped responding**

No heartbeat received for more than 60 seconds.

🕐 **Last seen:** ${timestamp}

⚠️ Please investigate immediately!
        `.trim(),
      };
    }

    // Regular alert formatting
    return {
      title: `${statusEmoji} ${service.name} - ${status.toUpperCase()}`,
      body: `
🚨 **Service Alert**

**Service:** ${service.name}
**Status:** ${status.toUpperCase()}
**Reason:** ${reason || 'Unknown'}

📊 **Current Metrics:**
• Latency: ${metrics.latency || 0}ms
• Error Rate: ${metrics.errorRate || 0}%
• Requests/min: ${metrics.requestCount || 0}
• Memory: ${metrics.memoryUsage || 0}MB

🕐 **Time:** ${timestamp}

⚠️ Please investigate immediately!
      `.trim(),
    };
  }

  /**
   * Send Telegram notification
   */
  async sendTelegram(message) {
    if (!this.telegramEnabled) return false;

    try {
      const url = `https://api.telegram.org/bot${this.telegramBotToken}/sendMessage`;
      await axios.post(url, {
        chat_id: this.telegramChatId,
        text: `${message.title}\n\n${message.body}`,
        parse_mode: 'Markdown',
      });
      console.log('✅ Telegram notification sent');
      return true;
    } catch (error) {
      console.error('❌ Failed to send Telegram notification:', error.message);
      return false;
    }
  }

  /**
   * Send Email notification
   */
  async sendEmail(message) {
    if (!this.emailEnabled) return false;

    try {
      await this.emailTransporter.sendMail({
        from: this.config.email.user,
        to: this.emailTo,
        subject: message.title,
        text: message.body,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #e74c3c;">${message.title}</h2>
            <pre style="background: #f4f4f4; padding: 15px; border-radius: 5px; white-space: pre-wrap;">${message.body}</pre>
          </div>
        `,
      });
      console.log('✅ Email notification sent');
      return true;
    } catch (error) {
      console.error('❌ Failed to send email notification:', error.message);
      return false;
    }
  }

  /**
   * Send Discord notification
   */
  async sendDiscord(message) {
    if (!this.discordEnabled) return false;

    try {
      const color = {
        healthy: 0x2ecc71,
        warning: 0xf39c12,
        degraded: 0xf39c12,
        critical: 0xe74c3c,
        unhealthy: 0xe74c3c,
      };

      await axios.post(this.discordWebhookUrl, {
        embeds: [
          {
            title: message.title,
            description: message.body,
            color: color[message.status] || 0x95a5a6,
            timestamp: new Date().toISOString(),
          },
        ],
      });
      console.log('✅ Discord notification sent');
      return true;
    } catch (error) {
      console.error('❌ Failed to send Discord notification:', error.message);
      return false;
    }
  }

  /**
   * Send alert notification
   * 
   * @param {object} service - Service object with name
   * @param {string} status - Current status (healthy/warning/critical/degraded/unhealthy)
   * @param {string} reason - Reason for status change
   * @param {object} metrics - Current metrics
   */
  async sendAlert(service, status, reason, metrics = {}) {
    // Check rate limiting
    if (!this.shouldNotify(service.name, status)) {
      return;
    }

    // Format message
    const message = this.formatMessage(service, status, reason, metrics);
    message.status = status; // Add for Discord color

    // Send to all configured channels
    const results = await Promise.allSettled([
      this.sendTelegram(message),
      this.sendEmail(message),
      this.sendDiscord(message),
    ]);

    // Update last notification time if at least one succeeded
    const anySucceeded = results.some(r => r.status === 'fulfilled' && r.value === true);
    if (anySucceeded) {
      this.lastNotificationTime[service.name] = Date.now();
      console.log(`📲 Notification sent for ${service.name} (${status})`);
    }
  }

  /**
   * Test notification (for setup verification)
   */
  async sendTestNotification() {
    const testService = { name: 'test-service' };
    const testMetrics = {
      latency: 150,
      errorRate: 5.2,
      requestCount: 45,
      memoryUsage: 128,
    };

    console.log('\n🧪 Sending test notification...\n');
    await this.sendAlert(testService, 'warning', 'Test notification', testMetrics);
  }
}

/**
 * Create and configure notification service from environment variables
 */
export function createNotificationService() {
  const config = {
    telegram: {
      botToken: process.env.TELEGRAM_BOT_TOKEN,
      chatId: process.env.TELEGRAM_CHAT_ID,
    },
    email: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
      to: process.env.EMAIL_TO,
    },
    discord: {
      webhookUrl: process.env.DISCORD_WEBHOOK_URL,
    },
  };

  return new NotificationService(config);
}

export default NotificationService;
