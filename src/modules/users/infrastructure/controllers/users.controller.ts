import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../../shared-kernel/infrastructure/decorators/current-user.decorator';
import { Public } from '../../../../shared-kernel/infrastructure/decorators/public.decorator';
import { ParseUUIDPipe } from '../../../../shared-kernel/infrastructure/pipes/parse-uuid.pipe';
import { SyncFirebaseUserUseCase } from '../../application/use-cases/sync-firebase-user.use-case';
import { GetUserByIdUseCase } from '../../application/use-cases/get-user-by-id.use-case';
import { RegisterUserUseCase } from '../../application/use-cases/register-user.use-case';
import { LoginUserUseCase } from '../../application/use-cases/login-user.use-case';
import { RefreshUserTokenUseCase } from '../../application/use-cases/refresh-user-token.use-case';
import { GetNotificationPreferencesUseCase } from '../../application/use-cases/get-notification-preferences.use-case';
import { UpdateNotificationPreferencesUseCase } from '../../application/use-cases/update-notification-preferences.use-case';
import { SeedLoginUseCase } from '../../application/use-cases/seed-login.use-case';
import { UpdateProfileUseCase } from '../../application/use-cases/update-profile.use-case';
import { ChangePasswordUseCase } from '../../application/use-cases/change-password.use-case';
import { RegisterUserDto } from '../../application/dtos/register-user.dto';
import { LoginUserDto } from '../../application/dtos/login-user.dto';
import { RefreshTokenDto } from '../../application/dtos/refresh-token.dto';
import { UpdateNotificationPreferencesDto } from '../../application/dtos/update-notification-preferences.dto';
import { SeedLoginDto } from '../../application/dtos/seed-login.dto';
import { UpdateProfileDto } from '../../application/dtos/update-profile.dto';
import { ChangePasswordDto } from '../../application/dtos/change-password.dto';
import { UserResponseDto } from '../../application/dtos/user-response.dto';
import { LoginResponseDto } from '../../application/dtos/login-response.dto';
import { NotificationPreferencesResponseDto } from '../../application/dtos/notification-preferences-response.dto';
import type { FirebaseUser } from '../../../../shared-kernel/infrastructure/guards/firebase-auth.guard';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly syncFirebaseUser: SyncFirebaseUserUseCase,
    private readonly getUserById: GetUserByIdUseCase,
    private readonly registerUser: RegisterUserUseCase,
    private readonly loginUser: LoginUserUseCase,
    private readonly refreshUserToken: RefreshUserTokenUseCase,
    private readonly getNotificationPreferences: GetNotificationPreferencesUseCase,
    private readonly updateNotificationPreferences: UpdateNotificationPreferencesUseCase,
    private readonly seedLogin: SeedLoginUseCase,
    private readonly updateProfile: UpdateProfileUseCase,
    private readonly changePassword: ChangePasswordUseCase,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar usuario en Firebase y en la BD local' })
  @ApiResponse({
    status: 201,
    description: 'Usuario creado',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 409, description: 'El usuario ya existe' })
  @ApiResponse({ status: 400, description: 'Datos de entrada invalidos' })
  async register(@Body() dto: RegisterUserDto) {
    return this.registerUser.execute(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesion con credenciales de Firebase' })
  @ApiResponse({
    status: 200,
    description: 'Login exitoso',
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Credenciales invalidas' })
  async login(@Body() dto: LoginUserDto) {
    return this.loginUser.execute(dto);
  }

  @Public()
  @Post('seed-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[DEV ONLY] Iniciar sesion con firebase_uid de un usuario seed',
  })
  @ApiResponse({
    status: 200,
    description: 'Login seed exitoso',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Usuario no encontrado o entorno no es development' })
  async seedLoginEndpoint(@Body() dto: SeedLoginDto) {
    return this.seedLogin.execute(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refrescar ID token usando refresh token de Firebase',
  })
  @ApiResponse({
    status: 200,
    description: 'Token renovado',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token invalido o expirado',
  })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.refreshUserToken.execute(dto);
  }

  @Get('me')
  @ApiBearerAuth('firebase-token')
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  @ApiResponse({
    status: 200,
    description: 'Perfil del usuario',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Token invalido o ausente' })
  async getMe(@CurrentUser() user: FirebaseUser) {
    const email = user.email?.trim();
    const hasValidEmail =
      typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!user.uid || !hasValidEmail) {
      throw new UnauthorizedException('Invalid Firebase token payload');
    }

    return this.syncFirebaseUser.execute({
      firebaseUid: user.uid,
      email,
    });
  }

  @Put('me')
  @ApiBearerAuth('firebase-token')
  @ApiOperation({ summary: 'Actualizar perfil del usuario (nombre, apellido, avatar, país, contraseña)' })
  @ApiResponse({ status: 200, description: 'Perfil actualizado', type: UserResponseDto })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  @ApiResponse({ status: 401, description: 'Token inválido o ausente' })
  async updateMe(
    @CurrentUser() user: FirebaseUser,
    @Body() dto: UpdateProfileDto,
  ) {
    if (!user.uid) {
      throw new ForbiddenException('Invalid token payload');
    }
    return this.updateProfile.execute({ firebaseUid: user.uid, dto });
  }

  @Put('me/password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('firebase-token')
  @ApiOperation({ summary: 'Cambiar contraseña del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Contraseña actualizada' })
  @ApiResponse({ status: 401, description: 'Contraseña actual incorrecta o token inválido' })
  @ApiResponse({ status: 503, description: 'Error al conectar con Firebase' })
  async changePasswordEndpoint(
    @CurrentUser() user: FirebaseUser,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.changePassword.execute({ firebaseUid: user.uid, dto });
    return { success: true, message: 'Password updated successfully' };
  }

  @Get('me/notification-preferences')
  @ApiBearerAuth('firebase-token')
  @ApiOperation({ summary: 'Obtener preferencias de notificacion del usuario' })
  @ApiResponse({
    status: 200,
    description: 'Preferencias de notificacion',
    type: NotificationPreferencesResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Token invalido o ausente' })
  @ApiResponse({ status: 404, description: 'Preferencias no encontradas' })
  async getNotificationPrefs(@CurrentUser() user: FirebaseUser) {
    const localUser = await this.syncFirebaseUser.execute({
      firebaseUid: user.uid,
      email: user.email!,
    });
    return this.getNotificationPreferences.execute(localUser.id);
  }

  @Put('me/notification-preferences')
  @ApiBearerAuth('firebase-token')
  @ApiOperation({ summary: 'Actualizar preferencias de notificacion (parcial)' })
  @ApiResponse({
    status: 200,
    description: 'Preferencias actualizadas',
    type: NotificationPreferencesResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Token invalido o ausente' })
  @ApiResponse({ status: 404, description: 'Preferencias no encontradas' })
  @ApiResponse({ status: 422, description: 'Valor invalido' })
  async updateNotificationPrefs(
    @CurrentUser() user: FirebaseUser,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    const localUser = await this.syncFirebaseUser.execute({
      firebaseUid: user.uid,
      email: user.email!,
    });
    return this.updateNotificationPreferences.execute({
      userId: localUser.id,
      dto,
    });
  }

  @Get(':id')
  @ApiBearerAuth('firebase-token')
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  @ApiResponse({
    status: 200,
    description: 'Usuario encontrado',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiResponse({ status: 401, description: 'Token invalido o ausente' })
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.getUserById.execute(id);
  }
}
