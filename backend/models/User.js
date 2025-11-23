import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
  },
  passwordHash: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
userSchema.index({ email: 1 });

const User = mongoose.model('User', userSchema);

export default User;
