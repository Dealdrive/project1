const nodemailer = require('nodemailer');
require('dotenv').config();

// to send email ->  firstly create a Transporter
let transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST, // -> Host SMTP detail
  auth: {
    user: process.env.MAIL_USER, // -> User's mail for authentication
    pass: process.env.MAIL_PASS, // -> User's password for authentication
  },
});
transporter.verify((error, success) => {
  if (error) {
    console.log(error);
  }
});

const sendAwardNotification = async (email, message, emaiSubject) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'your-email@gmail.com',
      pass: 'your-email-password',
    },
  });

  const mailOptions = {
    from: 'your-email@gmail.com',
    to: email,
    subject: emaiSubject,
    text: message,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email notification sent to', email);
  } catch (error) {
    console.error('Error sending email notification:', error);
  }
};

const sendOTPVerification = async (email, otp) => {
  try {
    // Define the email options
    const mailOptions = {
      from: process.env.EMAIL, // Sender address
      to: email, // List of recipients
      subject: 'Your OTP Verification Code', // Subject line
      text: `Your OTP code is ${otp}. It will expire in 10 minutes.`, // Plain text body
      html: `<p>Your OTP code is <b>${otp}</b>. It will expire in 10 minutes.</p>`, // HTML body
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);

    console.log('OTP sent: %s', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw new Error('Failed to send OTP email');
  }
};

module.exports = {
  sendAwardNotification,
  sendOTPVerification,
};
