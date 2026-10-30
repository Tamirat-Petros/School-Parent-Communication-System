import { HttpError } from "../utils/http-error.js";
import { assertStudentAccess, getAccessibleStudents } from "../services/authorization.service.js";
import { writeAuditLog } from "../utils/audit.js";

async function assertParents(parentIds, models) {
  const uniqueIds = [...new Set(parentIds.map(String))];
  const parents = await models.User.find({
    _id: { $in: uniqueIds },
    role: "parent",
    isActive: true,
  });

  if (parents.length !== uniqueIds.length) {
    throw new HttpError(400, "INVALID_PARENTS", "Select active parent accounts only.");
  }

  return uniqueIds;
}

async function assertClassGrade(classSectionId, gradeLevel, models) {
  const classSection = await models.ClassSection.findById(classSectionId);
  if (!classSection || !classSection.isActive) {
    throw new HttpError(400, "INVALID_CLASS", "Choose an active class.");
  }
  if (String(classSection.gradeLevel).toLowerCase() !== gradeLevel.toLowerCase()) {
    throw new HttpError(400, "GRADE_CLASS_MISMATCH", "The student's grade must match the selected class.");
  }
}

export function createStudentsController(models) {
  return {
    list: async (request, response) => {
      const students = await getAccessibleStudents(request.user, models);
      return response.json({ students });
    },

    get: async (request, response) => {
      const student = await models.Student.findById(request.params.studentId);
      await assertStudentAccess(request.user, student, models);
      return response.json({ student });
    },

    create: async (request, response) => {
      await assertClassGrade(request.body.classSectionId, request.body.gradeLevel, models);
      const parentIds = await assertParents(request.body.parentIds, models);
      const student = await models.Student.create({
        ...request.body,
        studentNumber: request.body.studentNumber.toUpperCase(),
        parentIds,
        isActive: true,
      });

      await writeAuditLog(models, request, {
        action: "student.created",
        entityType: "Student",
        entityId: student._id,
      });

      return response.status(201).json({ student });
    },

    update: async (request, response) => {
      const student = await models.Student.findById(request.params.studentId);
      if (!student || !student.isActive) {
        throw new HttpError(404, "STUDENT_NOT_FOUND", "Student record was not found.");
      }

      const updates = request.body;
      const gradeLevel = updates.gradeLevel ?? student.gradeLevel;
      const classSectionId = updates.classSectionId ?? student.classSectionId;
      if (updates.gradeLevel !== undefined || updates.classSectionId !== undefined) {
        await assertClassGrade(classSectionId, gradeLevel, models);
      }
      if (updates.parentIds !== undefined) {
        student.parentIds = await assertParents(updates.parentIds, models);
      }
      if (updates.firstName !== undefined) student.firstName = updates.firstName;
      if (updates.lastName !== undefined) student.lastName = updates.lastName;
      if (updates.studentNumber !== undefined) student.studentNumber = updates.studentNumber.toUpperCase();
      if (updates.gradeLevel !== undefined) student.gradeLevel = updates.gradeLevel;
      if (updates.classSectionId !== undefined) student.classSectionId = updates.classSectionId;
      await student.save();

      await writeAuditLog(models, request, {
        action: "student.updated",
        entityType: "Student",
        entityId: student._id,
      });

      return response.json({ student });
    },

    archive: async (request, response) => {
      const student = await models.Student.findById(request.params.studentId);
      if (!student || !student.isActive) {
        throw new HttpError(404, "STUDENT_NOT_FOUND", "Student record was not found.");
      }

      student.isActive = false;
      await student.save();
      await writeAuditLog(models, request, {
        action: "student.archived",
        entityType: "Student",
        entityId: student._id,
      });

      return response.json({ student });
    },
  };
}