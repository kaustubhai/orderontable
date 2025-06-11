module.exports = function createResponse(status, message, data) {
  const success = status === 200 ? true : false;
  if (!success && !message) message = "Internal Server Error";
  return {
    success,
    message,
    data,
  };
};
