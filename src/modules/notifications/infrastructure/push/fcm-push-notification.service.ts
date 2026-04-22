import { Inject, Injectable, Logger } from '@nestjs/common';
import type * as admin from 'firebase-admin';
import { FIREBASE_ADMIN } from '../../../../shared-kernel/infrastructure/firebase/firebase-admin.provider';
import type { IPushNotificationService } from '../../domain/interfaces/push-notification.service.interface';

@Injectable()
export class FcmPushNotificationService implements IPushNotificationService {
  private readonly logger = new Logger(FcmPushNotificationService.name);

  constructor(
    @Inject(FIREBASE_ADMIN)
    private readonly firebaseAdmin: admin.app.App,
  ) {}

  async sendPush(
    fcmToken: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<boolean> {
    try {
      // Data-only payload: el cliente (notifee en RN) se encarga del display.
      // Evita el auto-display de FCM en Android que exige meta-data de icono/canal
      // en AndroidManifest.xml y dispara crashes cuando no coincide con el cliente.
      const payload: Record<string, string> = {
        title,
        body,
        ...(data ?? {}),
      };

      await this.firebaseAdmin.messaging().send({
        token: fcmToken,
        data: payload,
        android: {
          priority: 'high',
          // Intencionalmente sin bloque "notification": data-only.
        },
        apns: {
          headers: {
            'apns-priority': '10',
            'apns-push-type': 'alert',
          },
          payload: {
            aps: {
              // iOS requiere "alert" para entregar la push en background/killed.
              // Sin esto, un data-only solo llega cuando la app está en foreground.
              alert: { title, body },
              sound: 'default',
              badge: 1,
              'content-available': 1,
            },
          },
        },
      });

      this.logger.debug(`Push sent to token ${fcmToken.substring(0, 10)}...`);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`FCM send failed: ${message}`);
      return false;
    }
  }
}
