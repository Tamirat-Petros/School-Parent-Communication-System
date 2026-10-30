import { HttpError } from "../utils/http-error.js";
import { writeAuditLog } from "../utils/audit.js";

async function assertTeachers(teacherIds, models) {
  const uniqueIds = [...new Set(teacherIds.map(String))];
  const teachers = await models.User.find({
    _id: { $in: uniqueIds },
    role: "teacher",
    isActive: true,
  });

  if (teachers.length !== uniqueIds.length) {
    throw new HttpError(400, "INVALID_TEACHERS", "Select active teacher accounts only.");
  }

  return uniqueIds;
}

export function createClassesController(models) {
  return {
    list: async (request, response) => {
      let filter = { isActive: true };
      if (request.user.role === "teacher") {
        filter.teachers = request.user._id;
      } else if (request.user.role === "parent") {
        const students = await models.Student.find({ parentIds: request.user._id, isActive: true });
        const classIds = [...new Set(students.map((student) => String(student.classSectionId)))];
        filter._id = { $in: classIds };
      }

      const classes = await models.ClassSection.find(filter)
        .sort({ gradeLevel: 1, name: 1 })
        .limit(100);
      return response.json({ classes });
    },

    create: async (request, response) => {
      const teacherIds = await assertTeachers(request.body.teacherIds ?? [], models);
      const classSection = await models.ClassSection.create({
        name: request.body.name,
        gradeLevel: request.body.gradeLevel,
        academicYear: request.body.academicYear,
        teachers: teacherIds,
        isActive: true,
      });

      await writeAuditLog(models, request, {
        action: "class.created",
        entityType: "ClassSection",
        entityId: classSection._id,
      });

      return response.status(201).json({ class: classSection });
    },

    update: async (request, response) => {
      const classSection = await models.ClassSection.findById(request.params.classId);
      if (!classSection || !classSection.isActive) {
        throw new HttpError(404, "CLASS_NOT_FOUND", "Class was not found.");
      }

      if (request.body.name !== undefined) classSection.name = request.body.name;
      if (request.body.gradeLevel !== undefined) classSection.gradeLevel = request.body.gradeLevel;
      if (request.body.academicYear !== undefined) classSection.academicYear = request.body.academicYear;
      if (request.body.teacherIds !== undefined) {
        classSection.teachers = await assertTeachers(request.body.teacherIds, models);
      }
      await classSection.save();

      await writeAuditLog(models, request, {
        action: "class.updated",
        entityType: "ClassSection",
        entityId: classSection._id,
      });

      return response.json({ class: classSection });
    },
  };
}