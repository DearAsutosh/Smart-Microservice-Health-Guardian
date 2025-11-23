import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Service from './models/Service.js';
import connectDB from './config/database.js';

dotenv.config();

const testDB = async () => {
  try {
    await connectDB();
    console.log('Connected to DB');

    const service = await Service.findOne({ name: 'auth-service' });
    if (service) {
      console.log('Found service:', service.name);
      service.currentMetrics.totalRequests = 999;
      await service.save();
      console.log('Updated service totalRequests to 999');
    } else {
      console.log('Service not found');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

testDB();
