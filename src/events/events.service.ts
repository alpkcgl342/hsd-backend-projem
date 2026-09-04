import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { MailService } from '../common/mail/mail.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { CreateRegistrationDto } from './dto/create-registration.dto';

const prisma = new PrismaClient();

@Injectable()
export class EventsService {
  constructor(private mail: MailService) {}

  async create(createEventDto: CreateEventDto) {
    return prisma.event.create({
      data: {
        title: createEventDto.title,
        description: createEventDto.description,
        category: createEventDto.category,
        location: createEventDto.location,
        startDate: new Date(createEventDto.startDate),
        endDate: createEventDto.endDate ? new Date(createEventDto.endDate) : null,
        capacity: createEventDto.capacity,
      },
    });
  }

  async findAll(category?: string, status?: string) {
      const where: any = {};

      if (category) {
        where.category = category;
      }

      if (status === 'upcoming') {
        where.startDate = { gte: new Date() };
      } else if (status === 'past') {
        where.startDate = { lt: new Date() };
      }

      return prisma.event.findMany({
        where,
        orderBy: { startDate: 'asc' },
      });
    }

  async findOne(id: string) {
    return prisma.event.findUnique({
      where: { id },
    });
  }

  async update(id: string, updateEventDto: UpdateEventDto) {
    return prisma.event.update({
      where: { id },
      data: {
        ...updateEventDto,
        startDate: updateEventDto.startDate ? new Date(updateEventDto.startDate) : undefined,
        endDate: updateEventDto.endDate ? new Date(updateEventDto.endDate) : undefined,
      },
    });
  }

  async remove(id: string) {
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      throw new NotFoundException(`${id} ID'li etkinlik bulunamadı`);
    }
    return prisma.event.delete({
      where: { id },
    });
  }

  async register(eventId: string, dto: CreateRegistrationDto) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { registrations: true },
    });

    if (!event) {
      throw new NotFoundException(`${eventId} ID'li etkinlik bulunamadı`);
    }

    if (event.isCancelled) {
      throw new BadRequestException('Bu etkinlik iptal edilmiş, kayıt alınamaz');
    }

    if (event.registrations.length >= event.capacity) {
      throw new BadRequestException('Kontenjan dolmuştur');
    }

    const registration = await prisma.eventRegistration.create({
      data: {
        eventId,
        fullName: dto.fullName,
        email: dto.email,
        studentNo: dto.studentNo,
      },
    });
  

  await this.mail.sendEventConfirmation(dto.email, dto.fullName, event.title);
  return registration;
  }

  async getRegistrations(eventId: string) {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException(`${eventId} ID'li etkinlik bulunamadı`);
    }

    return prisma.eventRegistration.findMany({
      where: { eventId },
      orderBy: { registeredAt: 'asc' },
    });
  }
}