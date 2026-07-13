import { Controller, Get, Param, Res } from "@nestjs/common";
import { Response } from "express";
import { InvoicesService } from "./invoices.service";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

@ApiTags("Public Customer Operations")
@Controller("public")
export class PublicInvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Throttle({ default: { limit: 10, ttl: 60 } })
  @Get("invoices/:token/pdf")
  @ApiOperation({
    summary: "Customer downloads invoice PDF using secure token",
  })
  async downloadInvoicePdf(
    @Param("token") token: string,
    @Res() res: Response,
  ) {
    const { pdfBuffer, filename } =
      await this.invoicesService.getInvoicePdfByPublicToken(token);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=${filename}`,
      "Content-Length": pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }
}
