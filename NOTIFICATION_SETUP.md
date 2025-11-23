# 📱 Notification Setup Guide

This guide will help you configure mobile notifications for critical service alerts.

## Quick Start

You only need to configure **ONE** notification method. We recommend **Telegram** for the easiest setup.

---

## Option 1: Telegram Bot (Recommended ⭐)

**Why Telegram?**
- ✅ Completely free
- ✅ Instant delivery
- ✅ Easy 5-minute setup
- ✅ Rich formatting support
- ✅ Works on all platforms

### Setup Steps

1. **Create a Telegram Bot**
   - Open Telegram and search for `@BotFather`
   - Send `/newbot` command
   - Follow the prompts to name your bot (e.g., "Health Guardian Bot")
   - Copy the **bot token** (looks like: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

2. **Get Your Chat ID**
   - Start a chat with your new bot
   - Send any message to it (e.g., "hello")
   - Open this URL in your browser (replace `<YOUR_BOT_TOKEN>` with your actual token):
     ```
     https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
     ```
   - Look for `"chat":{"id":` in the JSON response
   - Copy the number after `"id":` (e.g., `123456789` or `-987654321`)

3. **Configure .env**
   - Open `backend/.env`
   - Paste your values:
     ```bash
     TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
     TELEGRAM_CHAT_ID=123456789
     ```

4. **Test**
   - Restart the backend server
   - You should see: `📱 Telegram notifications enabled`
   - Trigger a test alert or wait for a real service issue

---

## Option 2: Email Notifications

**Good for:** Universal delivery (everyone has email)

### Setup Steps (Gmail)

1. **Enable 2-Step Verification**
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Enable "2-Step Verification" if not already enabled

2. **Generate App Password**
   - In Security settings, scroll to "App passwords"
   - Select "Mail" and "Other (Custom name)"
   - Enter "Health Guardian" as the name
   - Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)

3. **Configure .env**
   ```bash
   EMAIL_USER=your.email@gmail.com
   EMAIL_PASS=abcdefghijklmnop
   EMAIL_TO=your.email@gmail.com
   ```

4. **Test**
   - Restart the backend
   - You should see: `📧 Email notifications enabled`

---

## Option 3: Discord Webhook

**Good for:** If you already use Discord

### Setup Steps

1. **Create Webhook**
   - Open Discord
   - Go to Server Settings → Integrations → Webhooks
   - Click "New Webhook"
   - Name it "Health Guardian"
   - Select a channel (e.g., #alerts)
   - Copy the webhook URL

2. **Configure .env**
   ```bash
   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/123456789/abcdefghijklmnopqrstuvwxyz
   ```

3. **Test**
   - Restart the backend
   - You should see: `💬 Discord notifications enabled`

---

## Testing Notifications

After configuring any notification method:

1. **Restart the backend server**
   ```bash
   cd backend
   npm start
   ```

2. **Check the console** for confirmation:
   - `📱 Telegram notifications enabled` (if Telegram configured)
   - `📧 Email notifications enabled` (if Email configured)
   - `💬 Discord notifications enabled` (if Discord configured)

3. **Trigger a test alert** (optional):
   - Manually stop one of the microservices
   - Wait ~30 seconds for the system to detect the failure
   - You should receive a notification!

---

## Rate Limiting

To prevent notification spam:
- **Maximum 1 notification per service per 15 minutes**
- Only `warning` and `critical` alerts are sent
- `healthy` status changes do NOT trigger notifications

---

## Troubleshooting

### Telegram: "Unauthorized" error
- Double-check your bot token
- Make sure you've sent at least one message to the bot
- Verify the chat ID is correct (it can be negative)

### Email: "Invalid login" error
- Use an **App Password**, not your regular Gmail password
- Make sure 2-Step Verification is enabled
- Remove any spaces from the app password

### Discord: "Invalid webhook" error
- Verify the webhook URL is complete
- Make sure the webhook hasn't been deleted in Discord
- Check that the channel still exists

### No notifications received
- Check backend console for error messages
- Verify at least one notification method is configured
- Ensure the service status actually changed to `warning` or `critical`
- Check if rate-limiting is preventing the notification (15 min cooldown)

---

## Multiple Notification Channels

You can configure **all three** methods simultaneously! The system will send alerts to all configured channels.

Example `.env`:
```bash
# All three enabled
TELEGRAM_BOT_TOKEN=123456789:ABC...
TELEGRAM_CHAT_ID=123456789
EMAIL_USER=your.email@gmail.com
EMAIL_PASS=abcdefghijklmnop
EMAIL_TO=your.email@gmail.com
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

---

## Security Notes

- ✅ Never commit `.env` to version control (it's already in `.gitignore`)
- ✅ Use app-specific passwords for email (not your main password)
- ✅ Keep bot tokens and webhook URLs private
- ✅ Rotate credentials if they're ever exposed

---

## What's Next?

Once notifications are configured:
1. The system will automatically send alerts when services become unhealthy
2. You'll receive notifications with:
   - Service name and status
   - Current metrics (latency, error rate, etc.)
   - Timestamp
3. Rate-limiting prevents spam (max 1 per service per 15 min)

Happy monitoring! 🚀
