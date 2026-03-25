const mongoose = require('mongoose');

const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const value = req.params[paramName];
    if (!mongoose.Types.ObjectId.isValid(value)) {
      return res.status(400).json({ success: false, message: 'Invalid ID format' });
    }
    next();
  };
};

module.exports = validateObjectId;
