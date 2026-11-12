// =============================================================================
// CONTROLLER HELPER: RequestError
//
// When a controller finds a problem (bad input, record not found, name already
// used), it throws a RequestError. The error carries the HTTP status code and
// an optional list of field messages, so the Boundary can show each message
// under the right input box.
//
//   400 / 422 = the input is wrong
//   404       = the record does not exist (or is not yours)
//   409       = the input clashes with existing data (duplicate, still in use)
//
// middleware/errorHandler.js reads these fields and builds the HTTP reply.
// That is the only place that turns a RequestError into a response, so no
// route file needs its own error handling.
// =============================================================================

class RequestError extends Error {
  // status = HTTP status code, message = text for the red message box,
  // errors = optional { fieldName: 'message' } for the boxes on the form.
  constructor(status, message, errors) {
    super(message);
    this.name = 'RequestError';
    this.status = status;
    this.errors = errors;
  }
}

module.exports = RequestError;
