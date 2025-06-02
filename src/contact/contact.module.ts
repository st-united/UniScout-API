import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { MulterModule } from '@nestjs/platform-express';

@Module({
  imports: [MulterModule.register({  }),
      ],
  controllers: [ContactController],
  providers: [ContactService],
})
export class ContactModule {}
