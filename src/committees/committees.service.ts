import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateCommitteeDto } from './dto/create-committee.dto';
import { AddMemberDto } from './dto/add-member.dto';

const prisma = new PrismaClient();

@Injectable()
export class CommitteesService {
  create(dto: CreateCommitteeDto) {
    return prisma.committee.create({ data: dto });
  }

  findAll() {
    return prisma.committee.findMany({
      include: { members: { include: { user: { select: { fullName: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const committee = await prisma.committee.findUnique({
      where: { id },
      include: { members: { include: { user: { select: { fullName: true } } } } },
    });
    if (!committee) throw new NotFoundException('Komite bulunamadı');
    return committee;
  }

  async remove(id: string) {
    await this.findOne(id);
    return prisma.committee.delete({ where: { id } });
  }

  async addMember(committeeId: string, dto: AddMemberDto) {
    await this.findOne(committeeId);
    return prisma.committeeMember.create({
      data: { ...dto, committeeId },
    });
  }

  removeMember(memberId: string) {
    return prisma.committeeMember.delete({ where: { id: memberId } });
  }

  async getMembers(committeeId: string) {
    await this.findOne(committeeId);
    return prisma.committeeMember.findMany({
      where: { committeeId },
      include: { user: { select: { fullName: true, email: true } } },
    });
  }
}