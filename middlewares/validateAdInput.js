const { body, validationResult } = require('express-validator');

// Middleware to validate input fields
const validateSellAdInput = [
  body('assetToTrade').notEmpty().withMessage('Asset to trade is required'),
  body('priceType').notEmpty().withMessage('Price type is required'),
  body('elapsTime')
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage('Elaps time must be a positive integer'),
  body('paymentMethods').notEmpty().withMessage('Payment methods are required'),
  body('bankName').optional().isString().withMessage('Bank name must be a string'),
  body('accountName').optional().isString().withMessage('Account name must be a string'),
  body('accountNumber').optional().isNumeric().withMessage('Account number must be numeric'),
  body('priceMargin')
    .notEmpty()
    .isFloat({ min: 0 })
    .withMessage('Price margin must be a positive number'),
  body('amount').notEmpty().isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('minOrderLimit')
    .notEmpty()
    .isFloat({ min: 0 })
    .withMessage('Minimum order limit must be a positive number'),
  body('maxOrderLimit')
    .notEmpty()
    .isFloat({ min: 0 })
    .withMessage('Maximum order limit must be a positive number'),
  body('status')
    .notEmpty()
    .isIn(['active', 'inactive'])
    .withMessage('Status must be either active or inactive'),
  body('adType').notEmpty().isIn(['buy', 'sell']).withMessage('Ad type must be either buy or sell'),

  // Middleware to handle the validation results
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

module.exports = { validateSellAdInput };
