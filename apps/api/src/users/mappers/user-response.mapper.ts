import { SafeUserResponse } from "../types/safe-user-response";

export class UserResponseMapper {
  static toSafeUser(user: any): SafeUserResponse {
    // Exclude sensitive fields: passwordHash
    const {
      passwordHash,
      failedLoginAttempts,
      lockedUntil,
      refreshSessions,
      resetTokens,
      ...safeUser
    } = user;

    // Process branches if they were joined
    if (safeUser.userBranches) {
      safeUser.branches = safeUser.userBranches.map((ub: any) => ub.branch);
      delete safeUser.userBranches;
    }

    return safeUser as SafeUserResponse;
  }

  static toSafeUsers(users: any[]): SafeUserResponse[] {
    return users.map((user) => this.toSafeUser(user));
  }
}
