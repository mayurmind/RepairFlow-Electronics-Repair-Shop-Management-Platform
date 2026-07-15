import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  NotFoundException,
  ParseUUIDPipe,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AttachmentsService } from "./attachments.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { AttachmentCategory } from "@repairflow/shared-types";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
  ApiBody,
} from "@nestjs/swagger";
import { Response } from "express";

@ApiTags("Attachments")
@Controller()
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post("repair-tickets/:ticketId/attachments")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Upload file attachment for repair ticket" })
  async upload(
    @Param("ticketId", new ParseUUIDPipe({ version: "4" })) ticketId: string,
    @UploadedFile() file: any,
    @Body("category") category: AttachmentCategory,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const attachment = await this.attachmentsService.uploadAttachment(
      ticketId,
      file,
      category || "OTHER",
      actor,
    );
    return { success: true, data: attachment };
  }

  @Get("repair-tickets/:ticketId/attachments")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "List attachments for a repair ticket" })
  async findForTicket(
    @Param("ticketId", new ParseUUIDPipe({ version: "4" })) ticketId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const attachments = await this.attachmentsService.findForTicket(
      ticketId,
      actor,
    );
    return { success: true, data: attachments };
  }

  @Get("attachments/file/:storageKey")
  @ApiOperation({ summary: "Retrieve raw file" })
  async serveFile(
    @Param("storageKey") storageKey: string,
    @Res() res: Response,
  ) {
    const filePath = await this.attachmentsService.getFilePath(storageKey);
    res.sendFile(filePath);
  }

  @Delete("attachments/:id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Delete attachment" })
  async remove(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    await this.attachmentsService.remove(id, actor);
    return { success: true };
  }
}
