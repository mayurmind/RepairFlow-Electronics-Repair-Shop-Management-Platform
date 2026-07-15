import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { AuthenticatedRequest } from "../types/authenticated-request.type";

@Injectable()
export class BranchAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const { user } = request;

    if (!user) {
      return false;
    }

    if (user.role === "SYSTEM_ADMIN" || user.role === "OWNER") {
      return true;
    }

    const assignedBranchIds = user.branches.map(({ id }) => id);
    let targetBranchId: string | null = this.extractExplicitBranchId(request);
    const resourceId = request.params?.id;

    if (resourceId) {
      if (request.path.includes("/users")) {
        await this.assertSharedUserBranch(resourceId, assignedBranchIds);
      } else {
        targetBranchId =
          (await this.resolveResourceBranchId(request.path, resourceId)) ??
          targetBranchId;
      }
    }

    if (targetBranchId && !assignedBranchIds.includes(targetBranchId)) {
      throw new ForbiddenException(
        "Access denied: You do not belong to this branch.",
      );
    }

    return true;
  }

  private extractExplicitBranchId(request: AuthenticatedRequest): string | null {
    const body = request.body as Record<string, unknown> | undefined;
    const bodyBranchId = body?.branchId;
    if (typeof bodyBranchId === "string") {
      return bodyBranchId;
    }

    const queryBranchId = request.query?.branchId;
    if (typeof queryBranchId === "string") {
      return queryBranchId;
    }

    const paramBranchId = request.params?.branchId;
    return typeof paramBranchId === "string" ? paramBranchId : null;
  }

  private async assertSharedUserBranch(
    userId: string,
    assignedBranchIds: string[],
  ): Promise<void> {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { userBranches: { select: { branchId: true } } },
    });

    const targetBranchIds =
      targetUser?.userBranches.map(
        ({ branchId }: { branchId: string }) => branchId,
      ) ?? [];
    const sharesBranch = targetBranchIds.some((branchId: string) =>
      assignedBranchIds.includes(branchId),
    );

    if (!sharesBranch) {
      throw new ForbiddenException(
        "Access denied: You do not share a branch with this user.",
      );
    }
  }

  private async resolveResourceBranchId(
    path: string,
    id: string,
  ): Promise<string | null> {
    if (path.includes("/tickets")) {
      const ticket = await this.prisma.repairTicket.findUnique({
        where: { id },
        select: { branchId: true },
      });
      return ticket?.branchId ?? null;
    }

    if (path.includes("/estimates")) {
      const estimate = await this.prisma.estimate.findUnique({
        where: { id },
        select: { repairTicket: { select: { branchId: true } } },
      });
      return estimate?.repairTicket.branchId ?? null;
    }

    if (path.includes("/invoices")) {
      const invoice = await this.prisma.invoice.findUnique({
        where: { id },
        select: { repairTicket: { select: { branchId: true } } },
      });
      return invoice?.repairTicket.branchId ?? null;
    }

    if (path.includes("/attachments")) {
      const attachment = await this.prisma.attachment.findUnique({
        where: { id },
        select: { repairTicket: { select: { branchId: true } } },
      });
      return attachment?.repairTicket.branchId ?? null;
    }

    if (path.includes("/branches")) {
      return id;
    }

    return null;
  }
}
