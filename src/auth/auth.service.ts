import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma.service';
import { User, UserStatus } from '@prisma/client';
import { EmailService } from '../email/email.service';
import { randomBytes } from 'crypto';

export interface JwtPayload {
  sub: number;
  email: string;
  role?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  async validatePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  async register(email: string, name: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }
    
    const user = await this.prisma.user.create({
      data: {
        email,
        name,
        status: UserStatus.WAITLIST,
      },
    });

    // Create notification for admin
    await this.prisma.notification.create({
      data: {
        adminId: 1, // Default admin ID
        type: 'new_signup',
        title: 'New User Registration',
        message: `${name} (${email}) has registered and is waiting for approval`,
        data: {
          userId: user.id,
          email: user.email,
          name: user.name,
        },
      },
    });

    return user;
  }

  async validateAdmin(email: string, password: string): Promise<any> {
    const admin = await this.prisma.admin.findUnique({
      where: { email, isActive: true },
    });

    if (admin && await this.validatePassword(password, admin.password)) {
      const { password: _, ...result } = admin;
      return result;
    }
    return null;
  }

  async loginAdmin(admin: any) {
    const payload: JwtPayload = { 
      email: admin.email, 
      sub: admin.id,
      role: admin.role,
    };
    
    // Update last login
    await this.prisma.admin.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() },
    });
    
    return {
      access_token: this.jwtService.sign(payload),
      admin: {
        id: admin.id,
        email: admin.email,
        username: admin.username,
        role: admin.role,
      },
    };
  }

  // In-memory storage for reset tokens (expires in 1 hour)
  private resetTokens = new Map<string, { adminId: number; expires: Date }>();

  async sendPasswordResetEmail(email: string) {
    const admin = await this.prisma.admin.findUnique({
      where: { email },
    });

    if (!admin) {
      throw new Error('Admin with this email does not exist');
    }

    // Generate reset token
    const token = randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setHours(expires.getHours() + 1); // 1 hour expiry

    // Store token
    this.resetTokens.set(token, { adminId: admin.id, expires });

    // Get frontend URL from environment
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/auth/reset-password/${token}`;

    // Send email
    await this.emailService.sendEmail(
      admin.email,
      'Password Reset Request',
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #000044;">Password Reset Request</h2>
          <p>Hi ${admin.username},</p>
          <p>You requested to reset your password. Click the button below to reset it:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" 
               style="background-color: #F07400; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>Or copy and paste this link in your browser:</p>
          <p style="color: #666; word-break: break-all;">${resetLink}</p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            This link will expire in 1 hour. If you didn't request this, please ignore this email.
          </p>
        </div>
      `,
    );

    return { message: 'Password reset email sent successfully' };
  }

  async resetPassword(token: string, newPassword: string) {
    const tokenData = this.resetTokens.get(token);

    if (!tokenData) {
      throw new Error('Invalid or expired reset token');
    }

    if (new Date() > tokenData.expires) {
      this.resetTokens.delete(token);
      throw new Error('Reset token has expired');
    }

    // Hash new password
    const hashedPassword = await this.hashPassword(newPassword);

    // Update admin password
    await this.prisma.admin.update({
      where: { id: tokenData.adminId },
      data: { password: hashedPassword },
    });

    // Delete used token
    this.resetTokens.delete(token);

    return { message: 'Password updated successfully' };
  }
}