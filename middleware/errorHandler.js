const AppError = require('../utils/AppError');

const handleDuplicateFieldsError = () => new AppError('Resource already exists', 409);

const handleCastErrorDB = () => new AppError('Invalid ID format', 400);

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  return new AppError(`Invalid input data. ${errors.join('. ')}`, 400);
};

const handleJWTError = () => new AppError('Invalid or expired token', 401);

const sendErrorDev = (err, res) => {
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message,
    error: err,
    stack: err.stack
  });
};

const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message
    });
  }

  return res.status(500).json({
    success: false,
    message: 'Something went wrong'
  });
};

const errorHandler = (err, req, res, next) => {
  let error = err;

  if (!(error instanceof AppError)) {
    error.statusCode = error.statusCode || 500;
    error.message = error.message || 'Internal Server Error';
  }

  if (error.code === 11000) {
    error = handleDuplicateFieldsError(error);
  }

  if (error.name === 'CastError') {
    error = handleCastErrorDB(error);
  }

  if (error.name === 'ValidationError') {
    error = handleValidationErrorDB(error);
  }

  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    error = handleJWTError();
  }

  if (process.env.NODE_ENV === 'production') {
    sendErrorProd(error, res);
  } else {
    sendErrorDev(error, res);
  }
};

module.exports = errorHandler;
