import { HttpError } from "./http-error.js";

export function validate(schema) {
  return (request, _response, next) => {
    const result = schema.safeParse(request.body);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return next(new HttpError(400, "VALIDATION_ERROR", "Check the submitted fields.", details));
    }

    request.body = result.data;
    return next();
  };
}

export function validateQuery(schema) {
  return (request, _response, next) => {
    const result = schema.safeParse(request.query);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return next(new HttpError(400, "VALIDATION_ERROR", "Check the query parameters.", details));
    }

    request.validatedQuery = result.data;
    return next();
  };
}