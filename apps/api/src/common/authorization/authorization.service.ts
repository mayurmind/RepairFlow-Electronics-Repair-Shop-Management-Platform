import { Injectable, ForbiddenException } from "@nestjs/common";
import { UserRole } from "@repairflow/shared-types";

export interface ActorContext {
  id: string;
  role: UserRole;
  branchIds: string[];
}

export interface TargetContext {
  id?: string;
  role?: UserRole;
  branchIds?: string[];
}

@Injectable()
export class AuthorizationService {
  /**
   * Evaluates if the actor is allowed to perform a specific management action
   * on the target user role or across specific branches.
   */
  canManageUser(
    actor: ActorContext,
    target: TargetContext,
    action: "CREATE" | "UPDATE" | "SUSPEND" | "CHANGE_ROLE" | "ASSIGN_BRANCH",
  ) {
    // Cannot perform actions on yourself except basic update
    if (actor.id === target.id && action !== "UPDATE") {
      throw new ForbiddenException(
        `You cannot perform ${action} on your own account.`,
      );
    }

    if (actor.role === "SYSTEM_ADMIN") {
      return true;
    }

    if (actor.role === "OWNER") {
      // Owners cannot manage other owners or admins
      if (target.role === "SYSTEM_ADMIN" || target.role === "OWNER") {
        throw new ForbiddenException(
          `OWNER cannot manage users with role ${target.role}.`,
        );
      }
      return true;
    }

    if (actor.role === "BRANCH_MANAGER") {
      if (action === "CHANGE_ROLE") {
        throw new ForbiddenException("Branch Managers cannot change roles.");
      }

      if (
        target.role === "SYSTEM_ADMIN" ||
        target.role === "OWNER" ||
        target.role === "BRANCH_MANAGER"
      ) {
        throw new ForbiddenException(
          `Branch Managers cannot manage users with role ${target.role}.`,
        );
      }

      // Must share at least one branch
      if (target.branchIds && target.branchIds.length > 0) {
        const hasSharedBranch = target.branchIds.some((bid) =>
          actor.branchIds.includes(bid),
        );
        if (!hasSharedBranch) {
          throw new ForbiddenException(
            "You cannot manage a user outside your assigned branches.",
          );
        }
      }

      return true;
    }

    // Front Desk & Technician have no management rights
    throw new ForbiddenException("You do not have permission to manage users.");
  }

  canAssignBranch(actor: ActorContext, targetBranchId: string) {
    if (actor.role === "SYSTEM_ADMIN" || actor.role === "OWNER") {
      return true;
    }
    if (actor.role === "BRANCH_MANAGER") {
      if (!actor.branchIds.includes(targetBranchId)) {
        throw new ForbiddenException(
          "You cannot assign users to a branch you do not manage.",
        );
      }
      return true;
    }
    throw new ForbiddenException(
      "You do not have permission to assign branches.",
    );
  }

  canViewUser(actor: ActorContext, target: TargetContext) {
    if (actor.id === target.id) return true;
    if (actor.role === "SYSTEM_ADMIN" || actor.role === "OWNER") return true;
    if (actor.role === "BRANCH_MANAGER") {
      if (target.branchIds && target.branchIds.length > 0) {
        const hasSharedBranch = target.branchIds.some((bid) =>
          actor.branchIds.includes(bid),
        );
        if (hasSharedBranch) return true;
      }
    }
    throw new ForbiddenException(
      "You do not have permission to view this user profile.",
    );
  }
}
