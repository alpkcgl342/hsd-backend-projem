import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { MailService } from '../common/mail/mail.service';

@Module({
  controllers: [EventsController],
  providers: [EventsService, MailService]
})
export class EventsModule {}