import { HttpError } from "../utils/http-error.js";

function idsContain(ids = [], expectedId) {
  const expected = String(expectedId);
  return ids.some((id) => String(id?._id ?? id) === expected);
}

export function canAccessStudent(user, student, classSection) {
  if (!user || !student || !user.isActive || !student.isActive) return false;
  if (user.role === "admin") return true;
  if (user.role === "parent") return idsContain(student.parentIds, user._id);
  if (user.role === "teacher") return idsContain(classSection?.teachers, user._id);
  return false;
}

export async function assertStudentAccess(user, student, models) {
  if (!student || !student.isActive) throw new HttpError(404, "STUDENT_NOT_FOUND", "Student record was not found.");

  const classSection = user.role === "teacher"
    ? await models.ClassSection.findById(student.classSectionId)
    : null;

  if (!canAccessStudent(user, student, classSection)) {
    throw new HttpError(403, "STUDENT_ACCESS_DENIED", "You cannot access this student record.");
  }

  return student;
}

export async function getAccessibleStudents(user, models) {
  if (user.role === "admin") {
    return models.Student.find({ isActive: true }).sort({ lastName: 1, firstName: 1 });
  }

  if (user.role === "parent") {
    return models.Student.find({ parentIds: user._id, isActive: true }).sort({ lastName: 1, firstName: 1 });
  }

  if (user.role === "teacher") {
    const classes = await models.ClassSection.find({ teachers: user._id, isActive: true });
    const classIds = classes.map((classSection) => classSection._id);
    return models.Student.find({ classSectionId: { $in: classIds }, isActive: true })
      .sort({ lastName: 1, firstName: 1 });
  }

  throw new HttpError(403, "FORBIDDEN", "You do not have permission to access student records.");
}

export async function assertClassAccess(user, classSectionId, models, roles = ["admin", "teacher"]) {
  if (!roles.includes(user.role)) {
    throw new HttpError(403, "FORBIDDEN", "You do not have permission to access this class.");
  }

  const classSection = await models.ClassSection.findById(classSectionId);
  if (!classSection || !classSection.isActive) {
    throw new HttpError(404, "CLASS_NOT_FOUND", "Class was not found.");
  }

  if (user.role === "teacher" && !idsContain(classSection.teachers, user._id)) {
    throw new HttpError(403, "CLASS_ACCESS_DENIED", "You are not assigned to this class.");
  }

  return classSection;
}