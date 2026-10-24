export function notFound(request, response) {
  response.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "No route matches " + request.method + " " + request.path + ".",
    },
  });
}