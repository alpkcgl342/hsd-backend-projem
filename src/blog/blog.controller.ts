import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BlogService } from './blog.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateTagDto } from './dto/create-tag.dto';
import { SubscribeNewsletterDto } from './dto/subscribe-newsletter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  // --- BLOG YAZILARI ---

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.EDITOR)
  @Post()
  create(@Body() dto: CreatePostDto) {
    return this.blogService.create(dto);
  }

  @Get()
  findAll(@Query('categoryId') categoryId?: string, @Query('tagId') tagId?: string) {
    return this.blogService.findAll(categoryId, tagId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.blogService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.EDITOR)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePostDto) {
    return this.blogService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.blogService.remove(id);
  }

  // --- KATEGORİ ---

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('categories')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.blogService.createCategory(dto);
  }

  @Get('categories/all')
  findAllCategories() {
    return this.blogService.findAllCategories();
  }

  // --- ETİKET ---

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('tags')
  createTag(@Body() dto: CreateTagDto) {
    return this.blogService.createTag(dto);
  }

  @Get('tags/all')
  findAllTags() {
    return this.blogService.findAllTags();
  }

  // --- BÜLTEN ABONELİĞİ ---

  @Post('newsletter/subscribe')
  subscribe(@Body() dto: SubscribeNewsletterDto) {
    return this.blogService.subscribe(dto);
  }

  @Post('newsletter/unsubscribe')
  unsubscribe(@Body('email') email: string) {
    return this.blogService.unsubscribe(email);
  }
}