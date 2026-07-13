import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateEventDto } from './dto/create-event.dto';

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
}