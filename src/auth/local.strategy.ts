import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, IStrategyOptions } from 'passport-local';
import { AuthService } from './auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'email',
    } as IStrategyOptions);
  }

  async validate(email: string, password: string): Promise<any> {
    // NOTE: User authentication removed - this strategy is no longer used
    // const user = await this.authService.validateUser(email, password);
    // if (!user) {
    //   throw new Error('Invalid credentials');
    // }
    // return user;
    throw new Error('User authentication disabled');
  }
}

@Injectable()
export class AdminLocalStrategy extends PassportStrategy(Strategy, 'admin-local') {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'email',
    } as IStrategyOptions);
  }

  async validate(email: string, password: string): Promise<any> {
    const admin = await this.authService.validateAdmin(email, password);
    if (!admin) {
      throw new Error('Invalid admin credentials');
    }
    return admin;
  }
}