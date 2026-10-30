import { assertStudentAccess } from "../services/authorization.service.js";
import { daysBeforeSchoolDate, todaySchoolDate } from "../utils/school-date.js";

function selectedDateRange(query, env) {
  const today = todaySchoolDate(env.SCHOOL_TIMEZONE);
  return {
    from: query.from ?? daysBeforeSchoolDate(29, env.SCHOOL_TIMEZONE),
    to: query.to ?? today,
  };
}

function dateMatch(field, from, to) {
  return { [field]: { $gte: from, $lte: to } };
}

function serializeStudent(student, user) {
  const result = student.toObject ? student.toObject() : { ...student };
  if (user.role !== "admin") delete result.parentIds;
  return result;
}

export function createReportsController(models, env) {
  return {
    summary: async (request, response) => {
      const query = request.validatedQuery;
      const { from, to } = selectedDateRange(query, env);
      const commonMatch = {};
      if (query.classSectionId) commonMatch.classSectionId = query.classSectionId;

      const [attendanceGroups, gradeGroups, behaviorGroups] = await Promise.all([
        models.Attendance.aggregate([
          { $match: { ...commonMatch, ...dateMatch("schoolDate", from, to) } },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
        models.Grade.aggregate([
          { $match: { ...commonMatch, ...dateMatch("assessmentDate", from, to) } },
          {
            $group: {
              _id: "$subject",
              count: { $sum: 1 },
              averagePercent: {
                $avg: { $multiply: [{ $divide: ["$score", "$maxScore"] }, 100] },
              },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        models.BehaviorReport.aggregate([
          { $match: { ...commonMatch, ...dateMatch("reportDate", from, to) } },
          { $group: { _id: { status: "$status", category: "$category" }, count: { $sum: 1 } } },
        ]),
      ]);

      const attendance = Object.fromEntries(
        ["present", "absent", "late", "excused"].map((status) => [
          status,
          attendanceGroups.find((group) => group._id === status)?.count ?? 0,
        ]),
      );
      const behavior = behaviorGroups.map((group) => ({
        status: group._id.status,
        category: group._id.category,
        count: group.count,
      }));

      return response.json({
        range: { from, to, timeZone: env.SCHOOL_TIMEZONE ?? "Africa/Nairobi" },
        attendance,
        grades: gradeGroups.map((group) => ({
          subject: group._id,
          count: group.count,
          averagePercent: Number(group.averagePercent.toFixed(1)),
        })),
        behavior,
      });
    },

    student: async (request, response) => {
      const student = await models.Student.findById(request.params.studentId);
      await assertStudentAccess(request.user, student, models);
      const query = request.validatedQuery;
      const { from, to } = selectedDateRange(query, env);
      const sharedDates = { $gte: from, $lte: to };
      const behaviorFilter = {
        studentId: student._id,
        reportDate: sharedDates,
      };
      if (request.user.role === "parent") behaviorFilter.status = "approved";

      const [attendance, grades, behavior] = await Promise.all([
        models.Attendance.find({ studentId: student._id, schoolDate: sharedDates })
          .sort({ schoolDate: -1 })
          .limit(250),
        models.Grade.find({ studentId: student._id, assessmentDate: sharedDates })
          .sort({ assessmentDate: -1 })
          .limit(250),
        models.BehaviorReport.find(behaviorFilter)
          .sort({ reportDate: -1 })
          .limit(100),
      ]);

      const attendanceSummary = Object.fromEntries(
        ["present", "absent", "late", "excused"].map((status) => [
          status,
          attendance.filter((record) => record.status === status).length,
        ]),
      );
      const gradeAverage = grades.length
        ? grades.reduce((sum, grade) => sum + (grade.score / grade.maxScore) * 100, 0) / grades.length
        : null;

      return response.json({
        student: serializeStudent(student, request.user),
        range: { from, to },
        attendance: { summary: attendanceSummary, records: attendance },
        academics: {
          assessmentCount: grades.length,
          averagePercent: gradeAverage === null ? null : Number(gradeAverage.toFixed(1)),
          records: grades,
        },
        behavior,
      });
    },

    auditLogs: async (request, response) => {
      const query = request.validatedQuery;
      const filter = {};
      if (query.action) filter.action = query.action;
      if (query.entityType) filter.entityType = query.entityType;
      if (query.before) filter.createdAt = { $lt: new Date(query.before) };

      const logs = await models.AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .limit(query.limit);
      return response.json({
        auditLogs: logs.map((log) => ({
          id: String(log._id),
          actorId: log.actorId ?? null,
          action: log.action,
          entityType: log.entityType,
          entityId: log.entityId ?? null,
          ipAddress: log.ipAddress ?? null,
          metadata: log.metadata,
          createdAt: log.createdAt,
        })),
        nextCursor: logs.length > 0 ? logs[logs.length - 1].createdAt : null,
      });
    },
  };
}
