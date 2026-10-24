export function errorHandler(error, _request, response, _next) {
  console.error(error);

  response.status(error.status ?? 500).json({
    error: {
      code: error.code ?? "INTERNAL_SERVER_ERROR",
      message: error.status ? error.message : "An unexpected server error occurred.",
    },
  });
}