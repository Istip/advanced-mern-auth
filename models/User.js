const crypto = require('crypto');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Please enter the username!'],
  },
  email: {
    type: String,
    required: [true, 'Please enter your email address!'],
    unique: true,
    match: [
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
      'Please enter a valid email address!',
    ],
  },
  password: {
    type: String,
    required: [true, 'Please enter a password!'],
    minlength: 8,
    select: false,
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
});

// Pre save password hashing
// Must be pure JS function instead of ES6 arrow function
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);

  this.password = await bcrypt.hash(this.password, salt);

  next();
});

// Checking the match for the email and password
// Must be pure JS function instead of ES6 arrow function
UserSchema.methods.matchPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Method returning the token for the User
UserSchema.methods.getSignedToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// Method to reset the password token for User
UserSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString('hex');

  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // This calculation resets password after 10 minutes
  this.resetPasswordExpire = Date.now() + 10 * (60 * 1000);

  return resetToken;
};

const User = mongoose.model('User', UserSchema);

module.exports = User;
