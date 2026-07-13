import { Module } from "@nestjs/common";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { AuthorizationService } from "../common/authorization/authorization.service";

@Module({
  providers: [UsersService, AuthorizationService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
