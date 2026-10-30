import { HttpError } from "../utils/http-error.js";

export function errorHandler(error, _request, response, _next) {
  let status = error.status;
  let code = error.code;
  let message = error.message;
  let details = error.details;

  if (error?.code === 11000) {
    status = 409;
    code = "DUPLICATE_RECORD";
    message = "A record with the same unique value already exists.";
    details = undefined;
  } else if (error?.name === "ValidationError") {
    status = 400;
    code = "VALIDATION_ERROR";
    message = "The record did not pass database validation.";
    details = Object.values(error.errors ?? {}).map((item) => ({
      field: item.path,
      message: item.message,
    }));
  } else if (error?.name === "CastError" || error?.type === "entity.parse.failed") {
    status = 400;
    code = "INVALID_REQUEST";
    message = "The request contains an invalid value.";
    details = undefined;
  } else if (error?.type === "entity.too.large") {
    status = 413;
    code = "REQUEST_TOO_LARGE";
    message = "The request is larger than the allowed limit.";
    details = undefined;
  }

  if (!(error instanceof HttpError) && (!status || status >= 500)) {
    console.error("Unhandled API error:", error);
    status = 500;
    code = "INTERNAL_SERVER_ERROR";
    message = "An unexpected server error occurred.";
    details = undefined;
  }

  response.status(status ?? 500).json({
    error: {
      code: code ?? "INTERNAL_SERVER_ERROR",
      message: message ?? "An unexpected server error occurred.",
      ...(details ? { details } : {}),
    },
  });
}