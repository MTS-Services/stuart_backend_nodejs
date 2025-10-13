import { Controller, Post, Body, UseGuards, Request, HttpException, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  name: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    try {
      const user = await this.authService.register(
        registerDto.email,
        registerDto.name,
      );
      return {
        message: 'Registration submitted successfully. Admin will review and approve your application.',
        user,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Registration failed',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @UseGuards(AuthGuard('admin-local'))
  @Post('admin/login')
  async adminLogin(@Request() req) {
    return this.authService.loginAdmin(req.user);
  }
}