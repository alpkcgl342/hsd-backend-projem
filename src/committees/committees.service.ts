import { PrismaService } from '../prisma/prisma.service';
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateCommitteeDto } from './dto/create-committee.dto';
import { UpdateCommitteeDto } from './dto/update-committee.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';

// Komite adından URL-uyumlu bir slug üretir (Türkçe karakterler dâhil).
function slugUret(ad: string): string {
  const trMap: Record<string, string> = {
    ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ı: 'i', İ: 'i',
    ö: 'o', Ö: 'o', ş: 's', Ş: 's', ü: 'u', Ü: 'u',
    â: 'a', Â: 'a', î: 'i', Î: 'i', û: 'u', Û: 'u',
  };

  return ad
    .split('')
    .map((c) => trMap[c] || c)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// Herkese açık uçlarda üyelerin e-posta adresi döndürülmez.
const HERKESE_ACIK_UYE_ALANLARI = {
  id: true,
  fullName: true,
  department: true,
  role: true,
  photoUrl: true,
  linkedinUrl: true,
  order: true,
  joinedAt: true,
};

@Injectable()
export class CommitteesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCommitteeDto) {
    const slug = dto.slug || slugUret(dto.name);

    const mevcut = await this.prisma.committee.findFirst({
      where: { OR: [{ name: dto.name }, { slug }] },
    });
    if (mevcut) throw new ConflictException('Bu isimde veya slug ile bir komite zaten var');

    return this.prisma.committee.create({ data: { ...dto, slug } });
  }

  findAll() {
    return this.prisma.committee.findMany({
      include: {
        members: {
          select: HERKESE_ACIK_UYE_ALANLARI,
          orderBy: [{ order: 'asc' }, { joinedAt: 'asc' }],
        },
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findOne(id: string) {
    const committee = await this.prisma.committee.findUnique({
      where: { id },
      include: {
        members: {
          select: HERKESE_ACIK_UYE_ALANLARI,
          orderBy: [{ order: 'asc' }, { joinedAt: 'asc' }],
        },
      },
    });
    if (!committee) throw new NotFoundException('Komite bulunamadı');
    return committee;
  }

  async findBySlug(slug: string) {
    const committee = await this.prisma.committee.findUnique({
      where: { slug },
      include: {
        members: {
          select: HERKESE_ACIK_UYE_ALANLARI,
          orderBy: [{ order: 'asc' }, { joinedAt: 'asc' }],
        },
      },
    });
    if (!committee) throw new NotFoundException('Komite bulunamadı');
    return committee;
  }

  async update(id: string, dto: UpdateCommitteeDto) {
    await this.findOne(id);

    if (dto.name || dto.slug) {
      const slug = dto.slug || (dto.name ? slugUret(dto.name) : undefined);
      const cakisma = await this.prisma.committee.findFirst({
        where: {
          id: { not: id },
          OR: [...(dto.name ? [{ name: dto.name }] : []), ...(slug ? [{ slug }] : [])],
        },
      });
      if (cakisma) throw new ConflictException('Bu isim veya slug başka bir komitede kullanılıyor');

      return this.prisma.committee.update({ where: { id }, data: { ...dto, slug } });
    }

    return this.prisma.committee.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.committee.delete({ where: { id } });
  }

  // --- ÜYELER ---

  async addMember(committeeId: string, dto: AddMemberDto) {
    await this.findOne(committeeId);

    if (dto.userId) {
      const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
      if (!user) throw new NotFoundException('Eklenmek istenen kullanıcı bulunamadı');

      const mevcut = await this.prisma.committeeMember.findUnique({
        where: { committeeId_userId: { committeeId, userId: dto.userId } },
      });
      if (mevcut) throw new ConflictException('Bu kullanıcı zaten komitenin üyesi');
    }

    return this.prisma.committeeMember.create({ data: { ...dto, committeeId } });
  }

  async updateMember(memberId: string, dto: UpdateMemberDto) {
    const member = await this.prisma.committeeMember.findUnique({ where: { id: memberId } });
    if (!member) throw new NotFoundException('Komite üyesi bulunamadı');

    return this.prisma.committeeMember.update({ where: { id: memberId }, data: dto });
  }

  async removeMember(memberId: string) {
    const member = await this.prisma.committeeMember.findUnique({ where: { id: memberId } });
    if (!member) throw new NotFoundException('Komite üyesi bulunamadı');

    return this.prisma.committeeMember.delete({ where: { id: memberId } });
  }

  async getMembers(committeeId: string) {
    await this.findOne(committeeId);
    return this.prisma.committeeMember.findMany({
      where: { committeeId },
      select: HERKESE_ACIK_UYE_ALANLARI,
      orderBy: [{ order: 'asc' }, { joinedAt: 'asc' }],
    });
  }
}
