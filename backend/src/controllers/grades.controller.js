import { assertClassAccess, getAccessibleStudents } from "../services/authorization.service.js";
import { notifyStudentParents } from "../services/notifications.service.js";
import { HttpError } from "../utils/http-error.js";
import { writeAuditLog } from "../utils/audit.js";

export function createGradesController(models) {
  return {
    list: async (request, response) => {
      const query = request.validatedQuery;
      const students = await getAccessibleStudents(request.user, models);
      const filter = { studentId: { $in: students.map((student) => student._id) } };
      if (query.subject) filter.subject = query.subject;
      if (query.classSectionId) {
        if (request.user.role !== "parent") {
          await assertClassAccess(request.user, query.classSectionId, models);
        }
        filter.classSectionId = query.classSectionId;
      }
      if (query.from || query.to) {
        filter.assessmentDate = {};
        if (query.from) filter.assessmentDate.$gte = query.from;
        if (query.to) filter.assessmentDate.$lte = query.to;
      }

      const grades = await models.Grade.find(filter)
        .sort({ assessmentDate: -1, subject: 1 })
        .limit(Number(query.limit ?? 100));
      return response.json({ grades });
    },

    createAssessment: async (request, response) => {
      const classSection = await assertClassAccess(request.user, request.body.classSectionId, models);
      const studentIds = request.body.scores.map((record) => record.studentId);
      if (new Set(studentIds).size !== studentIds.length) {
        throw new HttpError(400, "DUPLICATE_STUDENT", "A student can appear only once in an assessment submission.");
      }

      const students = await models.Student.find({
        _id: { $in: studentIds },
        classSectionId: classSection._id,
        isActive: true,
      });
      if (students.length !== studentIds.length) {
        throw new HttpError(400, "STUDENT_NOT_IN_CLASS", "Every student must belong to the selected class.");
      }

      const records = request.body.scores.map((record) => ({
        studentId: record.studentId,
        classSectionId: classSection._id,
        subject: request.body.subject,
        assessmentName: request.body.assessmentName,
        assessmentType: request.body.assessmentType,
        assessmentDate: request.body.assessmentDate,
        score: record.score,
        maxScore: request.body.maxScore,
        remark: record.remark,
        enteredBy: request.user._id,
      }));
      const created = await models.Grade.insertMany(records, { ordered: false });

      for (const grade of created) {
        const student = students.find((item) => String(item._id) === String(grade.studentId));
        await notifyStudentParents(models, student, {
          actorId: request.user._id,
          kind: "grade",
          title: "New grade available",
          body: "A new " + grade.subject + " assessment result is available.",
          referenceType: "Grade",
          referenceId: grade._id,
        });
      }

      await writeAuditLog(models, request, {
        action: "grade.assessment.recorded",
        entityType: "ClassSection",
        entityId: classSection._id,
        metadata: {
          count: created.length,
          subject: request.body.subject,
          assessmentDate: request.body.assessmentDate,
        },
      });

      return response.status(201).json({ count: created.length, grades: created });
    },

    update: async (request, response) => {
      const grade = await models.Grade.findById(request.params.gradeId);
      if (!grade) throw new HttpError(404, "GRADE_NOT_FOUND", "Grade record was not found.");

      await assertClassAccess(request.user, grade.classSectionId, models);
      if (request.user.role === "teacher" && String(grade.enteredBy) !== String(request.user._id)) {
        throw new HttpError(403, "GRADE_ACCESS_DENIED", "You can update only grades you entered.");
      }

      const score = request.body.score ?? grade.score;
      const maxScore = request.body.maxScore ?? grade.maxScore;
      if (score > maxScore) {
        throw new HttpError(400, "SCORE_EXCEEDS_MAXIMUM", "The score cannot exceed the maximum score.");
      }

      if (request.body.score !== undefined) grade.score = request.body.score;
      if (request.body.maxScore !== undefined) grade.maxScore = request.body.maxScore;
      if (request.body.remark !== undefined) grade.remark = request.body.remark;
      await grade.save();

      await writeAuditLog(models, request, {
        action: "grade.updated",
        entityType: "Grade",
        entityId: grade._id,
      });

      return response.json({ grade });
    },
  };
}
