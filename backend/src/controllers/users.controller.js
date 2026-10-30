import bcrypt from "bcryptjs";
import { HttpError } from "../utils/http-error.js";
import { publicUser } from "../utils/auth-tokens.js";
import { writeAuditLog } from "../utils/audit.js";

export function createUsersController(models) {
  return {
    list: async (request, response) => {
      const query = request.validatedQuery;
      const filter = {};
      if (query.role) filter.role = query.role;
      if (query.active !== undefined) filter.isActive = query.active === "true";
      if (query.search) {
        const escaped = query.search.replace(/[.*+?^$()|[\]\\]/g, "\\$&");
        filter.$or = [
          { name: { $regex: escaped, $options: "i" } },
          { email: { $regex: escaped, $options: "i" } },
        ];
      }

      const users = await models.User.find(filter)
        .sort({ name: 1 })
        .limit(Number(query.limit ?? 50));
      return response.json({ users: users.map(publicUser) });
    },

    create: async (request, response) => {
      const email = request.body.email.toLowerCase();
      const existing = await models.User.findOne({
        $or: [
          { email },
          ...(request.body.phone ? [{ phone: request.body.phone }] : []),
        ],
      });
      if (existing) throw new HttpError(409, "ACCOUNT_EXISTS", "An account already uses that email or phone.");

      const user = await models.User.create({
        name: request.body.name,
        email,
        phone: request.body.phone,
        role: request.body.role,
        passwordHash: await bcrypt.hash(request.body.password, 12),
        isActive: true,
      });

      await writeAuditLog(models, request, {
        action: "user.created",
        entityType: "User",
        entityId: user._id,
        metadata: { role: user.role },
      });

      return response.status(201).json({ user: publicUser(user) });
    },

    updateStatus: async (request, response) => {
      const user = await models.User.findById(request.params.userId);
      if (!user) throw new HttpError(404, "USER_NOT_FOUND", "Account was not found.");
      if (String(user._id) === String(request.user._id) && !request.body.isActive) {
        throw new HttpError(400, "CANNOT_DEACTIVATE_SELF", "You cannot deactivate your own account.");
      }

      if (user.role === "admin" && user.isActive && !request.body.isActive) {
        const activeAdmins = await models.User.countDocuments({ role: "admin", isActive: true });
        if (activeAdmins <= 1) {
          throw new HttpError(409, "LAST_ADMIN", "At least one active administrator account must remain.");
        }
      }

      user.isActive = request.body.isActive;
      await user.save();

      if (!user.isActive) {
        await models.RefreshSession.deleteMany({ userId: user._id });
      }

      await writeAuditLog(models, request, {
        action: user.isActive ? "user.activated" : "user.deactivated",
        entityType: "User",
        entityId: user._id,
      });

      return response.json({ user: publicUser(user) });
    },
  };
}
