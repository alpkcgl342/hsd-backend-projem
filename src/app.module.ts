import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BlogModule } from './blog/blog.module';
import { EventsModule } from './events/events.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { ApplicationsModule } from './applications/applications.module';
import { CommitteesModule } from './committees/committees.module';
import { ContactModule } from './contact/contact.module';

@Module({
  imports: [AuthModule, BlogModule, EventsModule, AnnouncementsModule, ApplicationsModule, CommitteesModule, ContactModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
