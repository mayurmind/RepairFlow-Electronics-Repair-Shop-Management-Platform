import type { Request } from "express";
import type { AuthenticatedUser } from "../../auth/types/authenticated-user.type";

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
