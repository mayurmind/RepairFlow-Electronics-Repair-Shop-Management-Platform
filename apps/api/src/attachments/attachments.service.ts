import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttachmentCategory } from '@repairflow/shared-types';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AttachmentsService {
  private uploadDir = path.join(__dirname, '../../uploads');

  constructor(private readonly prisma: PrismaService) {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadAttachment(
    ticketId: string,
    file: any,
    category: AttachmentCategory,
    uploadedById: string,
  ) {
    // Validate ticket exists
    const ticket = await this.prisma.repairTicket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) {
      throw new NotFoundException('Repair ticket not found.');
    }

    if (!file) {
      throw new BadRequestException('No file provided.');
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
        uploadedById,
        category: category as any,
        originalName: file.originalname,
        storageKey,
        secureUrl,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      },
    });
  }

  async findForTicket(ticketId: string) {
    const ticket = await this.prisma.repairTicket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) {
      throw new NotFoundException('Repair ticket not found.');
    }

    return this.prisma.attachment.findMany({
      where: { repairTicketId: ticketId },
      orderBy: { createdAt: 'desc' },
      include: { uploadedBy: { select: { fullName: true } } },
    });
  }

  async getFilePath(storageKey: string): Promise<string> {
    const filePath = path.join(this.uploadDir, storageKey);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File not found on disk.');
    }
    return filePath;
  }

  async remove(id: string) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id },
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found.');
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
