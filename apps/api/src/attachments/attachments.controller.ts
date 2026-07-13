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
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AttachmentsService } from "./attachments.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
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
    @Param("ticketId") ticketId: string,
    @UploadedFile() file: any,
    @Body("category") category: AttachmentCategory,
    @CurrentUser() actor: any,
  ) {
    const attachment = await this.attachmentsService.uploadAttachment(
      ticketId,
      file,
      category || "OTHER",
      actor.id,
    );
    return { success: true, data: attachment };
  }

  @Get("repair-tickets/:ticketId/attachments")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "List attachments for a repair ticket" })
  async findForTicket(@Param("ticketId") ticketId: string) {
    const attachments = await this.attachmentsService.findForTicket(ticketId);
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
  async remove(@Param("id") id: string) {
    await this.attachmentsService.remove(id);
    return { success: true };
  }
}
