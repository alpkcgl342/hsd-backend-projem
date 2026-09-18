import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Patch,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { CreateEventPhotoDto } from './dto/create-event-photo.dto';
import { UpdateEventPhotoDto } from './dto/update-event-photo.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  // Etkinlik oluşturma/düzenleme/silme uçları korumasızdı; herkes
  // etkinlik oluşturabiliyor ve silebiliyordu.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.EDITOR)
  @Post()
  create(@Body() createEventDto: CreateEventDto) {
    return this.eventsService.create(createEventDto);
  }

  @Get()
  findAll(@Query('category') category?: string, @Query('status') status?: string) {
    return this.eventsService.findAll(category, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.EDITOR)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEventDto: UpdateEventDto) {
    return this.eventsService.update(id, updateEventDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.eventsService.remove(id);
  }

  // Kayıt olmak herkese açık kalmalı.
  @Post(':id/register')
  register(@Param('id') id: string, @Body() dto: CreateRegistrationDto) {
    return this.eventsService.register(id, dto);
  }

  // Katılımcı listesi ad, e-posta ve öğrenci numarası içerir;
  // herkese açık olmamalı.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.EDITOR)
  @Get(':id/registrations')
  getRegistrations(@Param('id') id: string) {
    return this.eventsService.getRegistrations(id);
  }

  // --- ETKİNLİK FOTOĞRAFLARI ---

  // Galeri herkese açık
  @Get(':id/photos')
  getPhotos(@Param('id') id: string) {
    return this.eventsService.getPhotos(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.EDITOR)
  @Post(':id/photos')
  addPhoto(@Param('id') id: string, @Body() dto: CreateEventPhotoDto) {
    return this.eventsService.addPhoto(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.EDITOR)
  @Patch('photos/:photoId')
  updatePhoto(@Param('photoId') photoId: string, @Body() dto: UpdateEventPhotoDto) {
    return this.eventsService.updatePhoto(photoId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.EDITOR)
  @Delete('photos/:photoId')
  removePhoto(@Param('photoId') photoId: string) {
    return this.eventsService.removePhoto(photoId);
  }
}
