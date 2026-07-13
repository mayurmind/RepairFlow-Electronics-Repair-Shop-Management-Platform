import { Module } from "@nestjs/common";
import { RepairTicketsService } from "./repair-tickets.service";
import { RepairTicketsController } from "./repair-tickets.controller";
import { PublicTicketsController } from "./public-tickets.controller";

@Module({
  providers: [RepairTicketsService],
  controllers: [RepairTicketsController, PublicTicketsController],
  exports: [RepairTicketsService],
})
export class RepairTicketsModule {}
