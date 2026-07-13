import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";

@Injectable()
export class BranchAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    // SYSTEM_ADMIN and OWNER bypass all branch check barriers
    if (user.role === "SYSTEM_ADMIN" || user.role === "OWNER") {
      return true;
    }

    // Extract user assigned branch list
    const userBranches = user.branches || [];
    const assignedBranchIds = userBranches.map((b: any) => b.id);

    // Extract target branch ID from params, query, or body
    const targetBranchId =
      request.params.branchId ||
      request.query.branchId ||
      request.body.branchId ||
      request.params.id; // Can match branch query direct in some cases

    // If the endpoint specifies a target branch, verify it matches
    if (targetBranchId && !assignedBranchIds.includes(targetBranchId)) {
      // Allow if request is a GET and the URL contains "branches" but they are fetching their own
      const path = request.url;
      if (
        path.includes("/branches/") &&
        assignedBranchIds.includes(request.params.id)
      ) {
        return true;
      }
      throw new ForbiddenException(
        "Access denied: You do not belong to this branch.",
      );
    }

    return true;
  }
}
