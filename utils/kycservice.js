const fs = require('fs');
const { TesseractWorker } = require('tesseract.js');

// In-memory data store (replace with a database in production)
let users = [];

// Tesseract worker for OCR (Optical Character Recognition)
const worker = new TesseractWorker();

// Endpoint for user registration
const register = (req, res) => {
  const { name, dob, address, document } = req.body;

  // Validate user input
  if (!name || !dob || !address || !document) {
    return res
      .status(400)
      .json({ error: 'Please provide name, date of birth, address, and document image' });
  }

  // Perform compliance checks (e.g., age verification)
  const age = calculateAge(dob);
  if (age < 18) {
    return res.status(400).json({ error: 'You must be at least 18 years old to register' });
  }

  // Store user information (in-memory for simplicity)
  const user = { name, dob, address, document };
  users.push(user);

  res.status(201).json({ message: 'User registered successfully', user });
};

// Endpoint for KYC verification
const verifyKYC = (req, res) => {
  const { dob, documentImage } = req.body;

  // Perform compliance checks (e.g., age verification)
  const age = calculateAge(dob);
  if (age < 18) {
    return res
      .status(400)
      .json({ error: 'You must be at least 18 years old to pass KYC verification' });
  }

  // Perform OCR on document image to extract date of birth
  extractDateOfBirthFromDocument(documentImage)
    .then((extractedDob) => {
      // Compare extracted date of birth with user inputted date of birth
      if (dob !== extractedDob) {
        return res
          .status(400)
          .json({ error: 'Date of birth on document does not match provided date of birth' });
      }

      // Dummy KYC verification logic (replace with real implementation)
      // In this example, we'll just return success if the user is above 18 and dates of birth match
      res.status(200).json({ message: 'KYC verification successful' });
    })
    .catch((error) => {
      console.error('Error extracting date of birth from document:', error);
      res.status(500).json({ error: 'Error processing document' });
    });
};

// Utility function to calculate age
function calculateAge(dob) {
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// Utility function to perform OCR and extract date of birth from document image
function extractDateOfBirthFromDocument(documentImage) {
  return new Promise((resolve, reject) => {
    // Save document image to a temporary file
    const filePath = 'document.jpg';
    const base64Data = documentImage.replace(/^data:image\/jpeg;base64,/, '');
    fs.writeFile(filePath, base64Data, 'base64', async (error) => {
      if (error) {
        reject(error);
      } else {
        // Perform OCR using Tesseract
        try {
          const {
            data: { text },
          } = await worker.recognize(filePath);
          // Extract date of birth (assuming it's in YYYY-MM-DD format)
          const dobMatch = text.match(/\d{4}-\d{2}-\d{2}/);
          if (dobMatch) {
            resolve(dobMatch[0]);
          } else {
            reject(new Error('Date of birth not found in document'));
          }
        } catch (error) {
          reject(error);
        }
      }
    });
  });
}

module.exports = {
  register,
  verifyKYC,
};
