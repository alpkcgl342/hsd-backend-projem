import { PrismaService } from '../prisma/prisma.service';
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateCommitteeDto } from './dto/create-committee.dto';
import { AddMemberDto } from './dto/add-member.dto';


@Injectable()
export class CommitteesService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateCommitteeDto) {
    return this.prisma.committee.create({ data: dto });
  }

  findAll() {
    return this.prisma.committee.findMany({
      include: { members: { include: { user: { select: { fullName: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const committee = await this.prisma.committee.findUnique({
      where: { id },
      include: { members: { include: { user: { select: { fullName: true } } } } },
    });
    if (!committee) throw new NotFoundException('Komite bulunamadı');
    return committee;
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.committee.delete({ where: { id } });
  }

  async addMember(committeeId: string, dto: AddMemberDto) {
    await this.findOne(committeeId);

    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('Eklenmek istenen kullanıcı bulunamadı');

    const existing = await this.prisma.committeeMember.findUnique({
      where: { committeeId_userId: { committeeId, userId: dto.userId } },
    });
    if (existing) throw new ConflictException('Bu kullanıcı zaten komitenin üyesi');

    return this.prisma.committeeMember.create({
      data: { ...dto, committeeId },
    });
  }

  async removeMember(memberId: string) {
    const member = await this.prisma.committeeMember.findUnique({ where: { id: memberId } });
    if (!member) throw new NotFoundException('Komite üyesi bulunamadı');

    return this.prisma.committeeMember.delete({ where: { id: memberId } });
  }

  // Herkese açık uç: e-posta adresi döndürülmez.
  async getMembers(committeeId: string) {
    await this.findOne(committeeId);
    return this.prisma.committeeMember.findMany({
      where: { committeeId },
      select: {
        id: true,
        role: true,
        photoUrl: true,
        joinedAt: true,
        user: { select: { fullName: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }
}