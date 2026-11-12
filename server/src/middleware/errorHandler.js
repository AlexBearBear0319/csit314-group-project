// =============================================================================
// MIDDLEWARE: errorHandler
// The one place where an error thrown anywhere (controller or entity) becomes
// an HTTP reply. Route files stay clean because they never catch errors.
//
// How it works: Express sends any thrown error to a function with 4 arguments
// (error, req, res, next). app.js registers this one last.
//
//   RequestError          -> the status the controller chose (400/404/409/422)
//   database unique clash -> 409 (two people saved the same name at once)
//   database link clash   -> 409 (the record is still used by another record)
//   anything else         -> 500, and we log the details in the server terminal
// =============================================================================

const RequestError = require('../controller/RequestError');

function errorHandler(error, req, res, next) {
  // If part of a reply was already sent we cannot send another one.
  if (res.headersSent) return next(error);

  // Errors we threw on purpose in a controller.
  if (error instanceof RequestError) {
    return res.status(error.status).json({ message: error.message, errors: error.errors });
  }

  // Safety net for the rare case where two requests pass the duplicate check
  // at the same moment. The controller checks first; the database has the last say.
  if (error.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({ message: 'This record already exists.' });
  }
  if (error.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(409).json({ message: 'This record is still in use, so it cannot be changed.' });
  }

  // A bug or a database problem. The browser only gets a plain message.
  console.error('Request failed:', error);
  return res.status(500).json({ message: 'The request could not be completed.' });
}

module.exports = errorHandler;
