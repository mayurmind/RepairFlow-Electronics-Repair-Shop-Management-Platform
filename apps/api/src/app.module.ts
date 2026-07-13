import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { BranchesModule } from "./branches/branches.module";
import { UsersModule } from "./users/users.module";
import { CustomersModule } from "./customers/customers.module";
import { DevicesModule } from "./devices/devices.module";
import { RepairTicketsModule } from "./repair-tickets/repair-tickets.module";
import { EstimatesModule } from "./estimates/estimates.module";
import { InvoicesModule } from "./invoices/invoices.module";
import { ReportsModule } from "./reports/reports.module";
import { AuditLogsModule } from "./audit-logs/audit-logs.module";
import { HealthModule } from "./health/health.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { SettingsModule } from "./settings/settings.module";
import { AttachmentsModule } from "./attachments/attachments.module";

@Module({
  imports: [
    // Configure global config reading env variables
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Configure global application rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests max per minute
      },
    ]),
    PrismaModule,
    AuditLogsModule, // Global logging
    AuthModule,
    BranchesModule,
    UsersModule,
    CustomersModule,
    DevicesModule,
    RepairTicketsModule,
    EstimatesModule,
    InvoicesModule,
    ReportsModule,
    HealthModule,
    NotificationsModule,
    SettingsModule,
    AttachmentsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // Enforces global rate limits
    },
  ],
})
export class AppModule {}
