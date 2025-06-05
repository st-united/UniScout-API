import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule } from '@nestjs/config'; //error

@Module({
  imports: [MulterModule.register({}), ConfigModule],
  controllers: [ContactController],
  providers: [ContactService],
})
export class ContactModule {}
