import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Res,
} from "@nestjs/common";
import { Response } from "express";
import { InvoicesService } from "./invoices.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/role.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { InvoiceStatus } from "@repairflow/shared-types";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { BranchAccessGuard } from "../common/guards/branch.guard";

@ApiTags("Invoices")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, BranchAccessGuard)
@Controller("invoices")
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post("repair-tickets/:ticketId/invoices")
  @Roles("SYSTEM_ADMIN", "OWNER", "BRANCH_MANAGER", "FRONT_DESK")
  @ApiOperation({
    summary: "Generate invoice from repair ticket approved estimate",
  })
  async create(
    @Param("ticketId") ticketId: string,
    @Body() body: any,
    @CurrentUser() actor: any,
  ) {
    const invoice = await this.invoicesService.createFromTicket(
      ticketId,
      body,
      actor,
    );
    return { success: true, data: invoice };
  }

  @Get("invoices")
  @ApiOperation({ summary: "List and filter invoices" })
  async findAll(
    @CurrentUser() actor: any,
    @Query("status") status?: InvoiceStatus,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    const result = await this.invoicesService.findAll(actor, {
      status,
      page,
      limit,
    });
    return {
      success: true,
      data: result.data,
      meta: result.meta,
    };
  }

  @Get("invoices/:id")
  @ApiOperation({ summary: "Get invoice details" })
  async findOne(@Param("id") id: string, @CurrentUser() actor: any) {
    const invoice = await this.invoicesService.findOne(id, actor);
    return { success: true, data: invoice };
  }

  @Post("invoices/:id/payments")
  @Roles("SYSTEM_ADMIN", "OWNER", "BRANCH_MANAGER", "FRONT_DESK")
  @ApiOperation({ summary: "Record payment transaction for invoice" })
  async recordPayment(
    @Param("id") id: string,
    @Body() body: any,
    @CurrentUser() actor: any,
  ) {
    const result = await this.invoicesService.recordPayment(id, body, actor);
    return { success: true, ...result };
  }

  @Get("invoices/:id/payments")
  @ApiOperation({ summary: "Get payments history recorded on this invoice" })
  async getPayments(@Param("id") id: string, @CurrentUser() actor: any) {
    const payments = await this.invoicesService.getPayments(id, actor);
    return { success: true, data: payments };
  }

  @Post("invoices/:id/void")
  @Roles("SYSTEM_ADMIN", "OWNER", "BRANCH_MANAGER")
  @ApiOperation({ summary: "Void unpaid invoice" })
  async voidInvoice(@Param("id") id: string, @CurrentUser() actor: any) {
    const invoice = await this.invoicesService.voidInvoice(id, actor);
    return { success: true, data: invoice };
  }

  @Get("invoices/:id/pdf")
  @ApiOperation({ summary: "Download invoice PDF" })
  async downloadPdf(
    @Param("id") id: string,
    @CurrentUser() actor: any,
    @Res() res: Response,
  ) {
    const invoice = await this.invoicesService.findOne(id, actor);
    const pdfBuffer = await this.invoicesService.generatePdf(invoice);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=${invoice.invoiceNumber}.pdf`,
      "Content-Length": pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }
}
