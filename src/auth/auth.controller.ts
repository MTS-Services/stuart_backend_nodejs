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

  @Post('admin/forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    try {
      await this.authService.sendPasswordResetEmail(body.email);
      return {
        success: true,
        message: 'Password reset link has been sent to your email',
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to send reset email',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('admin/reset-password')
  async resetPassword(@Body() body: { token: string; newPassword: string }) {
    try {
      await this.authService.resetPassword(body.token, body.newPassword);
      return {
        success: true,
        message: 'Password has been reset successfully',
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to reset password',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // User password reset endpoints
  @Post('reset-password/:email')
  async userResetPasswordByEmail(@Body() body: { email: string; newPassword: string }) {
    try {
      const result = await this.authService.userResetPassword(body.email, body.newPassword);
      return {
        success: true,
        message: 'Password has been set successfully. You can now login.',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to reset password',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('set-password')
  async setPassword(@Body() body: { email: string; password: string }) {
    try {
      const result = await this.authService.userResetPassword(body.email, body.password);
      return {
        success: true,
        message: 'Password has been set successfully',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to set password',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('user/login')
  async userLogin(@Body() body: { email: string; password: string }) {
    try {
      const result = await this.authService.loginUser(body.email, body.password);
      return {
        success: true,
        message: 'Login successful',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Login failed',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}