import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SubscriptionPlan, User } from '../../domain/entities/user.entity';

export const JWT_DEFAULT_TTL_SECONDS = 15 * 60;

export interface JwtCustomPayload {
  sub: string;
  email: string;
  role: SubscriptionPlan;
}

export interface SignedJwt {
  accessToken: string;
  expiresIn: number;
}

@Injectable()
export class JwtTokenService {
  constructor(private readonly jwtService: JwtService) {}

  async signFor(
    user: User,
    ttlSeconds = JWT_DEFAULT_TTL_SECONDS,
  ): Promise<SignedJwt> {
    const payload: JwtCustomPayload = {
      sub: user.id,
      email: user.email,
      role: user.subscriptionPlan,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: ttlSeconds,
    });

    return {
      accessToken,
      expiresIn: ttlSeconds,
    };
  }

  async verify(token: string): Promise<JwtCustomPayload> {
    return this.jwtService.verifyAsync<JwtCustomPayload>(token);
  }

  async verifyIgnoreExpiration(token: string): Promise<JwtCustomPayload> {
    return this.jwtService.verifyAsync<JwtCustomPayload>(token, {
      ignoreExpiration: true,
    });
  }
}
