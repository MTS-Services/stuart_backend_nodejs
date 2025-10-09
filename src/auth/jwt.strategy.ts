import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma.service';
import { JwtPayload } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'defaultSecret',
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.role === 'admin') {
      // Admin validation
      return await this.prisma.admin.findUnique({
        where: { id: payload.sub, isActive: true },
      });
    } else {
      // User validation
      return await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { profile: true },
      });
    }
  }
}