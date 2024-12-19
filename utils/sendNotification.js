const nodemailer = require("nodemailer");

// Configure the email transporter
// const transporter = nodemailer.createTransport({
//   service: "Gmail",
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST, // -> Host SMTP detail
  auth: {
    user: process.env.MAIL_USER, // -> User's mail for authentication
    pass: process.env.MAIL_PASS, // -> User's password for authentication
  },
});

// Function to send email notification
const sendEmailNotification = async (recipientEmail, subject, message) => {
  try {
    const mailOptions = {
      from: `"Starface" <${process.env.MAIL_USER}>`, // Sender address
      to: recipientEmail, // Receiver email address
      subject: subject, // Email subject
      text: message, // Plain text body
      html: `<p>${message}</p>`,
    };

    // Send the email
    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully to:", recipientEmail);
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

module.exports = sendEmailNotification;
