import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  platform: string;
  appVersion: string | null;
  fcmToken: string | null;
}

const ALLOWED_PLATFORMS = new Set(['ios', 'android']);

function getHeader(req: Request, name: string): string | undefined {
  const value = (req.headers as Record<string, unknown>)[name.toLowerCase()];
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) {
    const first: unknown = value[0];
    return typeof first === 'string' ? first.trim() : undefined;
  }
  return undefined;
}

export const DeviceInfoHeaders = createParamDecorator<undefined, DeviceInfo>(
  (_data, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<Request>();

    const deviceId = getHeader(req, 'X-Device-Id');
    const deviceName = getHeader(req, 'X-Device-Name');
    const platformRaw = getHeader(req, 'X-Platform');

    if (!deviceId) {
      throw new BadRequestException('Falta el encabezado X-Device-Id');
    }
    if (!deviceName) {
      throw new BadRequestException('Falta el encabezado X-Device-Name');
    }
    if (!platformRaw) {
      throw new BadRequestException('Falta el encabezado X-Platform');
    }

    const platform = platformRaw.toLowerCase();
    if (!ALLOWED_PLATFORMS.has(platform)) {
      throw new BadRequestException(
        'X-Platform debe ser "ios" o "android"',
      );
    }

    return {
      deviceId,
      deviceName,
      platform,
      appVersion: getHeader(req, 'X-App-Version') ?? null,
      fcmToken: getHeader(req, 'X-Fcm-Token') ?? null,
    };
  },
);

export const DeviceIdHeader = createParamDecorator<undefined, string>(
  (_data, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<Request>();
    const deviceId = getHeader(req, 'X-Device-Id');
    if (!deviceId) {
      throw new BadRequestException('Falta el encabezado X-Device-Id');
    }
    return deviceId;
  },
);
