import { Request, Response, NextFunction } from "express";
import { SystemRole } from "@prisma/client";
import { ApiError } from "../utils/ApiError";
import { verifyAccessToken, AccessTokenPayload } from "../services/token.service";
import { prisma } from "../config/prisma";
import { UNRESTRICTED_ROLES } from "../config/permissions";

declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    const bearerToken = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
    const token = bearerToken ?? req.cookies?.accessToken;

    if (!token) {
      throw ApiError.unauthorized("Authentication token missing");
    }

    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    next(ApiError.unauthorized("Invalid or expired token"));
  }
}

export function authorizeRoles(...roles: SystemRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden("You do not have permission to perform this action"));
    }
    next();
  };
}

/** Checks a granular permission key (e.g. "products.create") against the user's assigned RoleDefinition. */
export function requirePermission(permissionKey: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) return next(ApiError.unauthorized());

      if (UNRESTRICTED_ROLES.includes(req.user.role)) {
        return next();
      }

      if (!req.user.roleAssignmentId) {
        return next(ApiError.forbidden("No role assigned"));
      }

      const role = await prisma.roleDefinition.findUnique({
        where: { id: req.user.roleAssignmentId },
        include: { permissions: { where: { key: permissionKey } } },
      });

      if (!role || role.permissions.length === 0) {
        return next(ApiError.forbidden(`Missing permission: ${permissionKey}`));
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

/** Ensures the authenticated user's businessId is present and attaches it for scoping queries. */
export function requireBusiness(req: Request, _res: Response, next: NextFunction) {
  if (!req.user?.businessId) {
    return next(ApiError.forbidden("No business context for this account"));
  }
  next();
}
