import { assertClassAccess, getAccessibleStudents } from "../services/authorization.service.js";
import { notifyStudentParents } from "../services/notifications.service.js";
import { HttpError } from "../utils/http-error.js";
import { writeAuditLog } from "../utils/audit.js";
import { todaySchoolDate } from "../utils/school-date.js";

export function createBehaviorController(models, env = process.env) {
  return {
    list: async (request, response) => {
      const query = request.validatedQuery;
      let filter = {};
      if (request.user.role === "parent") {
        const students = await getAccessibleStudents(request.user, models);
        filter = {
          studentId: { $in: students.map((student) => student._id) },
          status: "approved",
        };
      } else if (request.user.role === "teacher") {
        const classes = await models.ClassSection.find({ teachers: request.user._id, isActive: true });
        filter = {
          classSectionId: { $in: classes.map((item) => item._id) },
          recordedBy: request.user._id,
        };
        if (query.status) filter.status = query.status;
      } else if (query.status) {
        filter.status = query.status;
      }

      const reports = await models.BehaviorReport.find(filter)
        .sort({ createdAt: -1 })
        .limit(Number(query.limit ?? 100));
      return response.json({ reports });
    },

    create: async (request, response) => {
      const classSection = await assertClassAccess(
        request.user,
        request.body.classSectionId,
        models,
      );
      const student = await models.Student.findOne({
        _id: request.body.studentId,
        classSectionId: classSection._id,
        isActive: true,
      });
      if (!student) throw new HttpError(400, "STUDENT_NOT_IN_CLASS", "Select a current student from this class.");

      const report = await models.BehaviorReport.create({
        ...request.body,
        classSectionId: classSection._id,
        reportDate: todaySchoolDate(env.SCHOOL_TIMEZONE),
        status: "pending",
        recordedBy: request.user._id,
      });

      await writeAuditLog(models, request, {
        action: "behavior.submitted",
        entityType: "BehaviorReport",
        entityId: report._id,
        metadata: { category: report.category },
      });

      return response.status(201).json({ report });
    },

    review: async (request, response) => {
      const report = await models.BehaviorReport.findById(request.params.reportId);
      if (!report) throw new HttpError(404, "BEHAVIOR_NOT_FOUND", "Behavior report was not found.");
      if (report.status !== "pending") {
        throw new HttpError(409, "REPORT_ALREADY_REVIEWED", "Only pending reports can be reviewed.");
      }

      report.status = request.body.status;
      report.reviewedBy = request.user._id;
      report.reviewedAt = new Date();
      report.reviewNote = request.body.reviewNote;
      await report.save();

      if (report.status === "approved") {
        const student = await models.Student.findById(report.studentId);
        if (student?.isActive) {
          await notifyStudentParents(models, student, {
            actorId: request.user._id,
            kind: "behavior",
            title: "Student behavior update",
            body: "A reviewed behavior update is available in the parent portal.",
            referenceType: "BehaviorReport",
            referenceId: report._id,
          });
        }
      }

      await writeAuditLog(models, request, {
        action: "behavior.reviewed",
        entityType: "BehaviorReport",
        entityId: report._id,
        metadata: { status: report.status },
      });

      return response.json({ report });
    },
  };
}
