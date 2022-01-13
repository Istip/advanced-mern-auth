const crypto = require('crypto');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');
const sendEmail = require('../utils/sendEmail');

// Function to register a new user
exports.register = async (req, res, next) => {
  const { username, email, password } = req.body;

  try {
    const user = await User.create({
      username,
      email,
      password,
    });

    // Returning the valid user registration credentials
    sendToken(user, 201, res);
  } catch (error) {
    next(error);
  }
};

// Function to log in with an already registered user
exports.login = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new ErrorResponse('Please enter email and password!', 400));
  }

  try {
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return next(new ErrorResponse('Invalid credentials!', 401));
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return next(new ErrorResponse('Invalid credentials!', 401));
    }

    // Returning the valid user login credentials
    sendToken(user, 200, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.forgotPassword = async (req, res, next) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return next(new ErrorResponse('Email could not be sent!', 404));
    }

    const resetToken = user.getResetPasswordToken();

    await user.save();

    // Change this local URL to your frontend's route
    const resetUrl = `http://localhost:3000/passwordreset/${resetToken}`;

    // Basic message text to send to the user
    const message = `
    <h1>You have requested a password reset!</h1>
    <p>Please go to link below to reset your password!</p>
    <a href=${resetUrl} clicktracking=off>${resetUrl}</a>
    `;

    // Nodemailer and SendGrid options
    try {
      await sendEmail({
        to: user.email,
        subject: 'Password reset',
        text: message,
      });

      res.status(200).json({ success: true, data: 'Email sent!' });
    } catch (error) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;

      await user.save();

      return next(new ErrorResponse('Email could not be sent!', 500));
    }
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.resetToken)
    .digest('hex');

  try {
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return next(new ErrorResponse('Invalid reset token!', 400));
    }

    user.password = req.body.password;

    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.status(201).json({ success: true, data: 'Password reset success!' });
  } catch (error) {
    next(error);
  }
};

// Function used in the login and register methods to create token
const sendToken = (user, statusCode, res) => {
  const token = user.getSignedToken();
  res.status(statusCode).json({ success: true, token });
};
