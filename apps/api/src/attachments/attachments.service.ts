import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AttachmentCategory } from "@repairflow/shared-types";
import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class AttachmentsService {
  private uploadDir = path.join(__dirname, "../../uploads");

  constructor(private readonly prisma: PrismaService) {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadAttachment(
    ticketId: string,
    file: any,
    category: AttachmentCategory,
    actor: AuthenticatedUser,
  ) {
    // Validate ticket exists
    const ticket = await this.prisma.repairTicket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) {
      throw new NotFoundException("Repair ticket not found.");
    }

    // Branch check
    if (actor.role !== "SYSTEM_ADMIN" && actor.role !== "OWNER") {
      if (!actor.branches?.map((b) => b.id).includes(ticket.branchId)) {
        throw new ForbiddenException("You do not belong to this branch.");
      }
    }

    // Technician check
    if (
      actor.role === "TECHNICIAN" &&
      ticket.assignedTechnicianId !== actor.id
    ) {
      throw new ForbiddenException(
        "You are not assigned to this repair ticket.",
      );
    }

    if (!file) {
      throw new BadRequestException("No file provided.");
    }

    // Generate safe storage key
    const fileExt = path.extname(file.originalname);
    const storageKey = `${uuidv4()}${fileExt}`;
    const filePath = path.join(this.uploadDir, storageKey);

    // Save to disk
    fs.writeFileSync(filePath, file.buffer);

    // Create secure URL referencing our static endpoint
    const secureUrl = `/api/v1/attachments/file/${storageKey}`;

    return this.prisma.attachment.create({
      data: {
        repairTicketId: ticketId,
        uploadedById: actor.id,
        category: category as any,
        originalName: file.originalname,
        storageKey,
        secureUrl,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      },
    });
  }

  async findForTicket(ticketId: string, actor: AuthenticatedUser) {
    const ticket = await this.prisma.repairTicket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) {
      throw new NotFoundException("Repair ticket not found.");
    }

    // Branch check
    if (actor.role !== "SYSTEM_ADMIN" && actor.role !== "OWNER") {
      if (!actor.branches?.map((b) => b.id).includes(ticket.branchId)) {
        throw new ForbiddenException("You do not belong to this branch.");
      }
    }

    // Technician check
    if (
      actor.role === "TECHNICIAN" &&
      ticket.assignedTechnicianId !== actor.id
    ) {
      throw new ForbiddenException(
        "You are not assigned to this repair ticket.",
      );
    }

    return this.prisma.attachment.findMany({
      where: { repairTicketId: ticketId },
      orderBy: { createdAt: "desc" },
      include: { uploadedBy: { select: { fullName: true } } },
    });
  }

  async getFilePath(storageKey: string): Promise<string> {
    const filePath = path.join(this.uploadDir, storageKey);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException("File not found on disk.");
    }
    return filePath;
  }

  async remove(id: string, actor: AuthenticatedUser) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id },
      include: { repairTicket: true },
    });

    if (!attachment) {
      throw new NotFoundException("Attachment not found.");
    }

    // Branch check
    if (actor.role !== "SYSTEM_ADMIN" && actor.role !== "OWNER") {
      if (
        !actor.branches
          ?.map((b) => b.id)
          .includes(attachment.repairTicket.branchId)
      ) {
        throw new ForbiddenException("You do not belong to this branch.");
      }
    }

    // Technician check
    if (
      actor.role === "TECHNICIAN" &&
      attachment.repairTicket.assignedTechnicianId !== actor.id
    ) {
      throw new ForbiddenException(
        "You are not assigned to this repair ticket.",
      );
    }

    // Remove from DB
    await this.prisma.attachment.delete({
      where: { id },
    });

    // Remove from disk
    const filePath = path.join(this.uploadDir, attachment.storageKey);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return { success: true };
  }
}
