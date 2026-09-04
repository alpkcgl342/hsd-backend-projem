import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { MailService } from '../common/mail/mail.service';

@Module({
  controllers: [ContactController],
  providers: [ContactService, MailService],
  exports: [ContactService, MailService],
})
export class ContactModule {}