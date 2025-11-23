// testTelegram.js
import { createNotificationService } from './services/notificationService.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from backend directory
dotenv.config({ path: join(__dirname, '.env') });

(async () => {
  const notif = createNotificationService();
  const testService = { name: 'test-service' };
  const testMetrics = {
    latency: 123,
    errorRate: 0,
    requestCount: 10,
    memoryUsage: 64,
  };
  console.log('🔧 Sending test Telegram alert...');
  await notif.sendAlert(testService, 'warning', 'Test notification from backend', testMetrics);
})();
