import { Module } from "@nestjs/common";
import { EstimatesService } from "./estimates.service";
import { EstimatesController } from "./estimates.controller";
import { PublicEstimatesController } from "./public-estimates.controller";

@Module({
  providers: [EstimatesService],
  controllers: [EstimatesController, PublicEstimatesController],
  exports: [EstimatesService],
})
export class EstimatesModule {}
