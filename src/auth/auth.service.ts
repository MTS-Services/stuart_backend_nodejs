import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma.service';
import { User, UserStatus } from '@prisma/client';
import { EmailService } from '../email/email.service';
import { randomBytes } from 'crypto';
import { rejects } from 'assert';

export interface JwtPayload {
  sub: number;
  email: string;
  role: string;
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

    await this.emailService.sendCustomizableEmail('new_user_signup', email, {
      userName: name,
      userEmail: email,
      currentYear: new Date().getFullYear().toString(),
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
    const admin = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!admin) {
      throw new Error('email does not exist');
    }

    // Generate reset token
    const token = randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setHours(expires.getHours() + 1); // 1 hour expiry

    // Store token
    this.resetTokens.set(email, { adminId: admin.id, expires });

    // Get frontend URL from environment
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/auth/reset/${email}`;

    // Send customizable email using template
    await this.emailService.sendCustomizableEmail('password_reset', admin.email, {
      userName: admin.name,
      resetPasswordUrl: resetLink,
      currentYear: new Date().getFullYear().toString(),
    });

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

  // User password reset (direct by email - for approved users)
  async userResetPassword(email: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });

    if (!user) {
      throw new Error('User with this email does not exist');
    }

    // Check if user is verified/approved
    if (user.status !== UserStatus.VERIFIED && user.status !== UserStatus.ACTIVE) {
      throw new Error('Your account must be approved before you can set a password. Please wait for admin approval.');
    }

    // Hash new password
    const hashedPassword = await this.hashPassword(newPassword);

    // Update user password
    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: { 
        password: hashedPassword,
        status: UserStatus.ACTIVE, // Set to active once password is set
      },
    });

    return { 
      message: 'Password set successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        status: updatedUser.status,
      },
    };
  }

  // User login
  async loginUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    if (!user.password) {
      throw new Error('Please set your password first using the link sent to your email');
    }

    const isValidPassword = await this.validatePassword(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Generate JWT token
    const payload: JwtPayload = { 
      email: user.email, 
      sub: user.id,
      role: user.role || 'user',
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        status: user.status,
        role: user.role || 'user',
        profile: user.profile ? {
          id: user.profile.id,
          status: user.profile.status,
          isActive: user.profile.isActive,
          rejectionReason: user.profile.rejectionReason
        } : null,
      },
    };
  }

  // Send password setup email to newly approved user
  async sendPasswordSetupEmail(email: string, name: string) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/auth/reset-password/${email}`;

    await this.emailService.sendEmail(
      email,
      'Set Your Password - Account Approved!',
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #667eea;">🎉 Welcome to Scan Me Maybe!</h2>
          <p>Hi ${name},</p>
          <p>Great news! Your account has been approved by our admin team.</p>
          <p><strong>Next Step:</strong> Set your password to access your dashboard and manage your QR cards.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" 
               style="background-color: #667eea; color: white; padding: 15px 30px; 
                      text-decoration: none; border-radius: 8px; display: inline-block;
                      font-weight: bold; font-size: 16px;">
              🔐 Set Your Password
            </a>
          </div>
          <p>Or copy and paste this link in your browser:</p>
          <p style="color: #666; word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px;">${resetLink}</p>
          <p style="margin-top: 30px;">Once you set your password, you'll be able to:</p>
          <ul style="line-height: 1.8;">
            <li>Access your dashboard</li>
            <li>View and manage your QR cards</li>
            <li>Track scans and matches</li>
            <li>Update your profile</li>
          </ul>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            If you didn't register for Scan Me Maybe, please ignore this email.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="text-align: center; color: #666; font-size: 12px;">
            © ${new Date().getFullYear()} Scan Me Maybe. All rights reserved.
          </p>
        </div>
      `,
    );

    return { message: 'Password setup email sent successfully' };
  }
}