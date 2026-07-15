import { CreateRegistrationDto } from './dto/create-registration.dto';
import { BadRequestException } from '@nestjs/common';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

const prisma = new PrismaClient();

@Injectable()
export class EventsService {
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

  async findAll() {
    return prisma.event.findMany({
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

    return prisma.eventRegistration.create({
      data: {
        eventId,
        fullName: dto.fullName,
        email: dto.email,
        studentNo: dto.studentNo,
      },
    });
  }
}
