import { assertClassAccess, getAccessibleStudents } from "../services/authorization.service.js";
import { notifyStudentParents } from "../services/notifications.service.js";
import { HttpError } from "../utils/http-error.js";
import { writeAuditLog } from "../utils/audit.js";

export function createAttendanceController(models) {
  return {
    list: async (request, response) => {
      const query = request.validatedQuery;
      const students = await getAccessibleStudents(request.user, models);
      let scopedStudents = students;

      if (query.classSectionId) {
        if (request.user.role !== "parent") {
          await assertClassAccess(request.user, query.classSectionId, models);
        }
        scopedStudents = students.filter(
          (student) => String(student.classSectionId) === query.classSectionId,
        );
      }

      const filter = { studentId: { $in: scopedStudents.map((student) => student._id) } };
      if (query.from || query.to) {
        filter.schoolDate = {};
        if (query.from) filter.schoolDate.$gte = query.from;
        if (query.to) filter.schoolDate.$lte = query.to;
      }

      const records = await models.Attendance.find(filter)
        .sort({ schoolDate: -1, studentId: 1 })
        .limit(query.limit);
      return response.json({ attendance: records });
    },

    recordClass: async (request, response) => {
      const classSection = await assertClassAccess(
        request.user,
        request.body.classSectionId,
        models,
      );
      const studentIds = request.body.records.map((record) => record.studentId);
      if (new Set(studentIds).size !== studentIds.length) {
        throw new HttpError(400, "DUPLICATE_STUDENT", "A student can appear only once in an attendance submission.");
      }

      const students = await models.Student.find({
        _id: { $in: studentIds },
        classSectionId: classSection._id,
        isActive: true,
      });
      if (students.length !== studentIds.length) {
        throw new HttpError(400, "STUDENT_NOT_IN_CLASS", "Every student must belong to the selected class.");
      }

      const existing = await models.Attendance.find({
        studentId: { $in: studentIds },
        schoolDate: request.body.schoolDate,
      });
      const previousStatus = new Map(existing.map((item) => [String(item.studentId), item.status]));
      const operations = request.body.records.map((record) => ({
        updateOne: {
          filter: { studentId: record.studentId, schoolDate: request.body.schoolDate },
          update: {
            $set: {
              status: record.status,
              note: record.note,
              classSectionId: classSection._id,
              recordedBy: request.user._id,
            },
          },
          upsert: true,
        },
      }));
      await models.Attendance.bulkWrite(operations, { ordered: true });
      const saved = await models.Attendance.find({
        studentId: { $in: studentIds },
        schoolDate: request.body.schoolDate,
      });

      for (const record of saved) {
        const oldStatus = previousStatus.get(String(record.studentId));
        if ((record.status === "absent" || record.status === "late") && oldStatus !== record.status) {
          const student = students.find((item) => String(item._id) === String(record.studentId));
          await notifyStudentParents(models, student, {
            actorId: request.user._id,
            kind: "attendance",
            title: record.status === "absent" ? "Attendance update" : "Late arrival",
            body: record.status === "absent"
              ? "Your child was marked absent on " + record.schoolDate + "."
              : "Your child was marked late on " + record.schoolDate + ".",
            referenceType: "Attendance",
            referenceId: record._id,
          });
        }
      }

      await writeAuditLog(models, request, {
        action: "attendance.recorded",
        entityType: "ClassSection",
        entityId: classSection._id,
        metadata: { count: saved.length, schoolDate: request.body.schoolDate },
      });

      return response.status(201).json({ count: saved.length, attendance: saved });
    },
  };
}
