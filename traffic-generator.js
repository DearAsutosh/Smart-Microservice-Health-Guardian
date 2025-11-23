import axios from 'axios';

const services = [
  { 
    name: 'auth-service', 
    url: 'http://localhost:3001',
    requests: [
      { method: 'POST', endpoint: '/login', data: { username: 'test', password: 'test123' } },
      { method: 'POST', endpoint: '/verify', data: { token: 'test-token' } },
      { method: 'POST', endpoint: '/logout', data: { token: 'test-token' } }
    ]
  },
  { 
    name: 'booking-service', 
    url: 'http://localhost:3002',
    requests: [
      { method: 'POST', endpoint: '/book', data: { service: 'hotel', date: '2024-01-01' } },
      { method: 'POST', endpoint: '/cancel', data: { bookingId: 'BK-123' } },
      { method: 'GET', endpoint: '/list' }
    ]
  },
  { 
    name: 'storage-service', 
    url: 'http://localhost:3003',
    requests: [
      { method: 'POST', endpoint: '/upload', data: { filename: 'test.txt', content: 'data' } },
      { method: 'GET', endpoint: '/download/test123' },
      { method: 'DELETE', endpoint: '/delete/test456' }
    ]
  }
];

console.log('🚦 Starting Traffic Generator...\n');
console.log('Generating realistic requests to all services...\n');

let requestCount = 0;
let successCount = 0;
let errorCount = 0;

// Generate random traffic
const generateTraffic = async () => {
  for (const service of services) {
    // Pick a random request pattern
    const request = service.requests[Math.floor(Math.random() * service.requests.length)];
    const url = service.url + request.endpoint;

    try {
      requestCount++;
      
      if (request.method === 'POST') {
        await axios.post(url, request.data, { timeout: 5000 });
      } else if (request.method === 'DELETE') {
        await axios.delete(url, { timeout: 5000 });
      } else {
        await axios.get(url, { timeout: 5000 });
      }
      
      successCount++;
    } catch (error) {
      errorCount++;
      // Services will have random failures - this is expected
    }
  }
  
  // Log stats every 10 requests
  if (requestCount % 30 === 0) {
    const errorRate = ((errorCount / requestCount) * 100).toFixed(1);
    console.log(`📊 Stats: ${requestCount} requests | ${successCount} success | ${errorCount} errors (${errorRate}%)`);
  }
};

// Generate traffic every 1 second (premium real-time traffic)
console.log('📊 Sending requests every 1 second...');
console.log('Press Ctrl+C to stop\n');

setInterval(generateTraffic, 1000);

// Initial burst
generateTraffic();
