import { PrismaService } from '../prisma/prisma.service';
import { PostStatus } from '@prisma/client';
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateTagDto } from './dto/create-tag.dto';
import { SubscribeNewsletterDto } from './dto/subscribe-newsletter.dto';


// Türkçe karakterleri de düzgün şekilde URL-uyumlu slug'a çevirir
function generateSlug(title: string): string {
  const trMap: Record<string, string> = {
    ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ı: 'i', İ: 'i',
    ö: 'o', Ö: 'o', ş: 's', Ş: 's', ü: 'u', Ü: 'u',
    // Düzeltme işaretli harfler eşlenmediği için slug'dan tamamen düşüyordu
    // ("Yapay Zekâ" -> "yapay-zek").
    â: 'a', Â: 'a', î: 'i', Î: 'i', û: 'u', Û: 'u',
  };
  const normalized = title
    .split('')
    .map((char) => trMap[char] || char)
    .join('');

  return normalized
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    + '-' + Date.now().toString().slice(-5); // aynı başlıkta çakışmayı önlemek için
}

// Ortalama okuma hızı: dakikada ~200 kelime
function calculateReadingTime(content: string): number {
  const wordCount = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

@Injectable()
export class BlogService {
  constructor(private prisma: PrismaService) {}

  // --- BLOG YAZILARI ---

  async create(dto: CreatePostDto) {
    const slug = generateSlug(dto.title);
    const readingTime = calculateReadingTime(dto.content);

    return this.prisma.blogPost.create({
      data: {
        title: dto.title,
        content: dto.content,
        slug,
        readingTime,
        status: dto.status,
        authorId: dto.authorId,
        categoryId: dto.categoryId,
        tags: dto.tagIds ? { connect: dto.tagIds.map((id) => ({ id })) } : undefined,
      },
      include: { category: true, tags: true },
    });
  }

  // Herkese açık liste: yalnızca yayımlanmış yazılar döner.
  // Daha önce taslak (DRAFT) yazılar da bu listede görünüyordu.
  findAll(categoryId?: string, tagId?: string) {
    return this.prisma.blogPost.findMany({
      where: {
        status: PostStatus.PUBLISHED,
        ...(categoryId && { categoryId }),
        ...(tagId && { tags: { some: { id: tagId } } }),
      },
      include: { category: true, tags: true, author: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Yönetim paneli için: taslaklar dâhil tüm yazılar.
  findAllForAdmin(categoryId?: string, tagId?: string) {
    return this.prisma.blogPost.findMany({
      where: {
        ...(categoryId && { categoryId }),
        ...(tagId && { tags: { some: { id: tagId } } }),
      },
      include: { category: true, tags: true, author: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const post = await this.prisma.blogPost.findUnique({
      where: { id },
      include: { category: true, tags: true, author: { select: { fullName: true } } },
    });

    if (!post) throw new NotFoundException('Blog yazısı bulunamadı');

    // Taslak yazılar herkese açık uçtan okunamaz.
    if (post.status !== PostStatus.PUBLISHED) {
      throw new NotFoundException('Blog yazısı bulunamadı');
    }

    // Her görüntülemede sayaç artırılır
    return this.prisma.blogPost.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
      include: { category: true, tags: true, author: { select: { fullName: true } } },
    });
  }

  async update(id: string, dto: UpdatePostDto) {
    const existing = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Blog yazısı bulunamadı');

    return this.prisma.blogPost.update({
      where: { id },
      data: {
        title: dto.title,
        content: dto.content,
        status: dto.status,
        categoryId: dto.categoryId,
        readingTime: dto.content ? calculateReadingTime(dto.content) : undefined,
        tags: dto.tagIds ? { set: dto.tagIds.map((tid) => ({ id: tid })) } : undefined,
      },
      include: { category: true, tags: true },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Blog yazısı bulunamadı');
    return this.prisma.blogPost.delete({ where: { id } });
  }

  // --- KATEGORİ ---

  async createCategory(dto: CreateCategoryDto) {
    const existing = await this.prisma.category.findUnique({ where: { name: dto.name } });
    if (existing) throw new ConflictException('Bu kategori zaten var');
    return this.prisma.category.create({ data: dto });
  }

  findAllCategories() {
    return this.prisma.category.findMany();
  }

  // --- ETİKET ---

  async createTag(dto: CreateTagDto) {
    const existing = await this.prisma.tag.findUnique({ where: { name: dto.name } });
    if (existing) throw new ConflictException('Bu etiket zaten var');
    return this.prisma.tag.create({ data: dto });
  }

  findAllTags() {
    return this.prisma.tag.findMany();
  }

  // --- BÜLTEN ABONELİĞİ ---

  async subscribe(dto: SubscribeNewsletterDto) {
    const existing = await this.prisma.newsletterSubscriber.findUnique({ where: { email: dto.email } });

    if (existing) {
      if (existing.isActive) {
        throw new ConflictException('Bu e-posta zaten abone');
      }
      // Daha önce abonelikten çıkmışsa tekrar aktif et
      return this.prisma.newsletterSubscriber.update({
        where: { email: dto.email },
        data: { isActive: true },
      });
    }

    return this.prisma.newsletterSubscriber.create({ data: dto });
  }

  async unsubscribe(email: string) {
    const existing = await this.prisma.newsletterSubscriber.findUnique({ where: { email } });
    if (!existing) throw new NotFoundException('Bu e-posta abone listesinde bulunamadı');

    return this.prisma.newsletterSubscriber.update({
      where: { email },
      data: { isActive: false },
    });
  }
}