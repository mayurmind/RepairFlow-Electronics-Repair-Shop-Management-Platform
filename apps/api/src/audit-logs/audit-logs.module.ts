import { Global, Module } from "@nestjs/common";
import { AuditLogsService } from "./audit-logs.service";
import { AuditLogsController } from "./audit-logs.controller";

@Global() // Global so all services can log audits without importing AuditLogsModule
@Module({
  providers: [AuditLogsService],
  controllers: [AuditLogsController],
  exports: [AuditLogsService],
})
export class AuditLogsModule {}
