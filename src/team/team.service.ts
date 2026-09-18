import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';

@Injectable()
export class TeamService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateTeamMemberDto) {
    return this.prisma.teamMember.create({ data: dto });
  }

  // Sayfadaki sıralamayı korumak için önce gruba, sonra sıra numarasına göre
  findAll() {
    return this.prisma.teamMember.findMany({
      orderBy: [{ group: 'asc' }, { order: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findOne(id: string) {
    const uye = await this.prisma.teamMember.findUnique({ where: { id } });
    if (!uye) throw new NotFoundException('Ekip üyesi bulunamadı');
    return uye;
  }

  async update(id: string, dto: UpdateTeamMemberDto) {
    await this.findOne(id);
    return this.prisma.teamMember.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.teamMember.delete({ where: { id } });
  }
}
