import { PrismaService } from '../prisma/prisma.service';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { MailService } from '../common/mail/mail.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { CreateEventPhotoDto } from './dto/create-event-photo.dto';
import { UpdateEventPhotoDto } from './dto/update-event-photo.dto';


@Injectable()
export class EventsService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  async create(createEventDto: CreateEventDto) {
    return this.prisma.event.create({
      data: {
        title: createEventDto.title,
        description: createEventDto.description,
        category: createEventDto.category,
        location: createEventDto.location,
        startDate: new Date(createEventDto.startDate),
        endDate: createEventDto.endDate ? new Date(createEventDto.endDate) : null,
        capacity: createEventDto.capacity,
        coverImage: createEventDto.coverImage,
      },
      include: { photos: { orderBy: { order: 'asc' } } },
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

      return this.prisma.event.findMany({
        where,
        include: { photos: { orderBy: { order: 'asc' } } },
        orderBy: { startDate: 'asc' },
      });
    }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: { photos: { orderBy: { order: 'asc' } } },
    });
    if (!event) throw new NotFoundException(`${id} ID'li etkinlik bulunamadı`);
    return event;
  }

  async update(id: string, updateEventDto: UpdateEventDto) {
    return this.prisma.event.update({
      where: { id },
      data: {
        ...updateEventDto,
        startDate: updateEventDto.startDate ? new Date(updateEventDto.startDate) : undefined,
        endDate: updateEventDto.endDate ? new Date(updateEventDto.endDate) : undefined,
      },
    });
  }

  async remove(id: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) {
      throw new NotFoundException(`${id} ID'li etkinlik bulunamadı`);
    }
    return this.prisma.event.delete({
      where: { id },
    });
  }

  async register(eventId: string, dto: CreateRegistrationDto) {
    // Kontenjan kontrolü ile kaydın oluşturulması ayrı sorgulardaydı.
    // Eş zamanlı isteklerde hepsi "yer var" görüp kayıt oluşturabiliyor,
    // kontenjan aşılabiliyordu. Artık ikisi tek bir transaction içinde
    // ve satır kilidi (FOR UPDATE) altında yapılıyor.
    const { registration, eventTitle } = await this.prisma.$transaction(async (tx) => {
      const event = await tx.event.findUnique({ where: { id: eventId } });

      if (!event) {
        throw new NotFoundException(`${eventId} ID'li etkinlik bulunamadı`);
      }

      if (event.isCancelled) {
        throw new BadRequestException('Bu etkinlik iptal edilmiş, kayıt alınamaz');
      }

      // Etkinlik satırını kilitle: aynı etkinliğe gelen diğer kayıt
      // istekleri bu transaction bitene kadar bekler.
      await tx.$queryRaw`SELECT id FROM "Event" WHERE id = ${eventId} FOR UPDATE`;

      const registeredCount = await tx.eventRegistration.count({ where: { eventId } });

      if (registeredCount >= event.capacity) {
        throw new BadRequestException('Kontenjan dolmuştur');
      }

      const created = await tx.eventRegistration.create({
        data: {
          eventId,
          fullName: dto.fullName,
          email: dto.email,
          studentNo: dto.studentNo,
        },
      });

      return { registration: created, eventTitle: event.title };
    });

    // E-posta transaction dışında gönderilir; SMTP yavaşlığı kilidi uzatmasın.
    await this.mail.sendEventConfirmation(dto.email, dto.fullName, eventTitle);

    return registration;
  }

  async getRegistrations(eventId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException(`${eventId} ID'li etkinlik bulunamadı`);
    }

    return this.prisma.eventRegistration.findMany({
      where: { eventId },
      orderBy: { registeredAt: 'asc' },
    });
  }

  // --- ETKİNLİK FOTOĞRAFLARI ---

  async addPhoto(eventId: string, dto: CreateEventPhotoDto) {
    await this.findOne(eventId);
    return this.prisma.eventPhoto.create({ data: { ...dto, eventId } });
  }

  async getPhotos(eventId: string) {
    await this.findOne(eventId);
    return this.prisma.eventPhoto.findMany({
      where: { eventId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async updatePhoto(photoId: string, dto: UpdateEventPhotoDto) {
    const photo = await this.prisma.eventPhoto.findUnique({ where: { id: photoId } });
    if (!photo) throw new NotFoundException('Fotoğraf bulunamadı');

    return this.prisma.eventPhoto.update({ where: { id: photoId }, data: dto });
  }

  async removePhoto(photoId: string) {
    const photo = await this.prisma.eventPhoto.findUnique({ where: { id: photoId } });
    if (!photo) throw new NotFoundException('Fotoğraf bulunamadı');

    return this.prisma.eventPhoto.delete({ where: { id: photoId } });
  }
}