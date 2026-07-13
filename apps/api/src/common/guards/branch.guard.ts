import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class BranchAccessGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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
    let targetBranchId: string | null = null;
    const path = request.url;
    const method = request.method;

    if (request.body && request.body.branchId) {
      targetBranchId = request.body.branchId;
    } else if (request.query && request.query.branchId) {
      targetBranchId = request.query.branchId as string;
    } else if (request.params && request.params.branchId) {
      targetBranchId = request.params.branchId;
    }

    // Dynamic lookups based on resource in path for mutations and lookups
    if (request.params && request.params.id) {
      const id = request.params.id;

      if (path.includes("/tickets")) {
        const t = await this.prisma.repairTicket.findUnique({ where: { id } });
        if (t) targetBranchId = t.branchId;
      } else if (path.includes("/estimates")) {
        const e = await this.prisma.estimate.findUnique({
          where: { id },
          include: { repairTicket: true },
        });
        if (e) targetBranchId = e.repairTicket.branchId;
      } else if (path.includes("/invoices")) {
        const i = await this.prisma.invoice.findUnique({
          where: { id },
          include: { repairTicket: true },
        });
        if (i) targetBranchId = i.repairTicket.branchId;
      } else if (path.includes("/attachments")) {
        const a = await this.prisma.attachment.findUnique({
          where: { id },
          include: { repairTicket: true },
        });
        if (a) targetBranchId = a.repairTicket.branchId;
      } else if (path.includes("/branches")) {
        targetBranchId = id; // direct branch ID
      }
    }

    // If the endpoint targets a specific branch, verify it matches
    if (targetBranchId && !assignedBranchIds.includes(targetBranchId)) {
      throw new ForbiddenException(
        "Access denied: You do not belong to this branch.",
      );
    }

    return true;
  }
}
