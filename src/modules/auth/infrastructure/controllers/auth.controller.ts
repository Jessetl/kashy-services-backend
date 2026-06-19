import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../../../shared-kernel/infrastructure/decorators/public.decorator';
import { CurrentUserId } from '../../../../shared-kernel/infrastructure/decorators/current-user-id.decorator';
import { RegisterUserUseCase } from '../../application/use-cases/register-user.use-case';
import { LoginUserUseCase } from '../../application/use-cases/login-user.use-case';
import { LoginWithGoogleUseCase } from '../../application/use-cases/login-with-google.use-case';
import { RefreshTokenUseCase } from '../../application/use-cases/refresh-token.use-case';
import { GetUserByIdUseCase } from '../../application/use-cases/get-user-by-id.use-case';
import { UpdateProfileUseCase } from '../../application/use-cases/update-profile.use-case';
import { LogoutUseCase } from '../../application/use-cases/logout.use-case';
import { ChangePasswordUseCase } from '../../application/use-cases/change-password.use-case';
import { RecoverPasswordUseCase } from '../../application/use-cases/recover-password.use-case';
import { RegisterUserDto } from '../../application/dtos/register-user.dto';
import { LoginUserDto } from '../../application/dtos/login-user.dto';
import { LoginGoogleDto } from '../../application/dtos/login-google.dto';
import { ChangePasswordDto } from '../../application/dtos/change-password.dto';
import { UpdateProfileDto } from '../../application/dtos/update-profile.dto';
import { RecoverPasswordDto } from '../../application/dtos/recover-password.dto';
import { RefreshTokenDto } from '../../application/dtos/refresh-token.dto';
import { AuthResponseDto } from '../../application/dtos/auth-response.dto';
import { RefreshResponseDto } from '../../application/dtos/refresh-response.dto';
import { RegisterResponseDto } from '../../application/dtos/register-response.dto';
import { UserResponseDto } from '../../application/dtos/user-response.dto';
import {
  ApiErrorResponse,
  ApiValidationErrorResponse,
} from '../../../../shared-kernel/application/responses/api-response.dto';
import {
  DeviceInfo,
  DeviceInfoHeaders,
} from '../decorators/device-info.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUser: RegisterUserUseCase,
    private readonly loginUser: LoginUserUseCase,
    private readonly loginWithGoogle: LoginWithGoogleUseCase,
    private readonly refreshToken: RefreshTokenUseCase,
    private readonly getUserById: GetUserByIdUseCase,
    private readonly updateProfileUseCase: UpdateProfileUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    private readonly recoverPasswordUseCase: RecoverPasswordUseCase,
  ) {}

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Registrar nuevo usuario',
    description:
      'Crea cuenta en Firebase Auth, fila en users y preferencias por defecto. Envia correo de verificacion via Firebase. No emite JWT — el usuario debe verificar su email e iniciar sesion.',
  })
  @ApiResponse({
    status: 201,
    description: 'Usuario registrado, correo de verificacion enviado',
    type: RegisterResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Body malformado',
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 409,
    description: 'Email ya registrado',
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 422,
    description:
      'Validacion fallida (incluye contraseña debil/comprometida rechazada por Firebase)',
    type: ApiValidationErrorResponse,
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit excedido (>3/min)',
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 500,
    description: 'Fallo interno al crear la cuenta (Firebase o DB)',
    type: ApiErrorResponse,
  })
  register(@Body() dto: RegisterUserDto): Promise<RegisterResponseDto> {
    return this.registerUser.execute(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login con email + password',
    description:
      'Autentica contra Firebase, upserta el dispositivo en user_devices (sin almacenar refresh) y devuelve JWT custom (15 min) + refreshToken de Firebase + perfil. El cliente debe guardar el refreshToken en Keychain (iOS) o Keystore (Android).',
  })
  @ApiHeader({ name: 'X-Device-Id', required: true })
  @ApiHeader({ name: 'X-Device-Name', required: true })
  @ApiHeader({
    name: 'X-Platform',
    required: true,
    description: 'Plataforma del cliente. Valores permitidos: ios | android',
  })
  @ApiHeader({
    name: 'X-App-Version',
    required: false,
    description: 'Version semver de la app (ej. 1.2.3)',
  })
  @ApiHeader({ name: 'X-Fcm-Token', required: false })
  @ApiResponse({
    status: 200,
    description: 'Login exitoso',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Credenciales invalidas',
    type: ApiErrorResponse,
  })
  login(
    @Body() dto: LoginUserDto,
    @DeviceInfoHeaders() device: DeviceInfo,
  ): Promise<AuthResponseDto> {
    return this.loginUser.execute({ dto, device });
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login/google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login con idToken de Google via Firebase',
    description:
      'Verifica el idToken de Google contra Firebase (signInWithIdp), crea el usuario si no existe (auto-registro), upserta el dispositivo en user_devices (sin almacenar refresh) y devuelve JWT custom + refreshToken de Firebase + perfil. El cliente debe guardar el refreshToken en Keychain (iOS) o Keystore (Android).',
  })
  @ApiHeader({ name: 'X-Device-Id', required: true })
  @ApiHeader({ name: 'X-Device-Name', required: true })
  @ApiHeader({
    name: 'X-Platform',
    required: true,
    description: 'Plataforma del cliente. Valores permitidos: ios | android',
  })
  @ApiHeader({
    name: 'X-App-Version',
    required: false,
    description: 'Version semver de la app (ej. 1.2.3)',
  })
  @ApiHeader({ name: 'X-Fcm-Token', required: false })
  @ApiResponse({
    status: 200,
    description: 'Login con Google exitoso',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'googleIdToken invalido',
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Token de Google rechazado',
    type: ApiErrorResponse,
  })
  loginGoogle(
    @Body() dto: LoginGoogleDto,
    @DeviceInfoHeaders() device: DeviceInfo,
  ): Promise<AuthResponseDto> {
    return this.loginWithGoogle.execute({ dto, device });
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Renovar JWT custom',
    description:
      'Endpoint publico (sin Bearer). El cliente envia el refreshToken de Firebase en el body + headers de dispositivo. El backend intercambia el refresh contra Firebase, valida device binding (user del idToken == device.userId) y firma un nuevo JWT custom. Devuelve nuevo accessToken + refreshToken (puede rotar) + expiresIn.',
  })
  @ApiHeader({ name: 'X-Device-Id', required: true })
  @ApiHeader({ name: 'X-Device-Name', required: true })
  @ApiHeader({
    name: 'X-Platform',
    required: true,
    description: 'Plataforma del cliente. Valores permitidos: ios | android',
  })
  @ApiHeader({
    name: 'X-App-Version',
    required: false,
    description: 'Version semver de la app (ej. 1.2.3)',
  })
  @ApiResponse({
    status: 200,
    description: 'JWT renovado',
    type: RefreshResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token invalido, revocado o device no autorizado',
    type: ApiErrorResponse,
  })
  refresh(
    @Body() dto: RefreshTokenDto,
    @DeviceInfoHeaders() device: DeviceInfo,
  ): Promise<RefreshResponseDto> {
    return this.refreshToken.execute({
      refreshToken: dto.refreshToken,
      deviceId: device.deviceId,
    });
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('recover-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Envio de email de recuperacion de contraseña',
    description:
      'Envia un correo de Firebase con el enlace para restablecer la contraseña. Responde 204 incluso si el email no existe, para evitar enumeracion de usuarios.',
  })
  @ApiResponse({ status: 204, description: 'Email de recuperacion enviado' })
  @ApiResponse({
    status: 400,
    description: 'Email invalido',
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 422,
    description: 'Email mal formado',
    type: ApiValidationErrorResponse,
  })
  recoverPassword(@Body() dto: RecoverPasswordDto): Promise<void> {
    return this.recoverPasswordUseCase.execute(dto);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('jwt')
  @ApiOperation({
    summary: 'Cambio de contraseña del usuario autenticado',
    description:
      'Verifica la contraseña actual contra Firebase, actualiza la nueva y revoca todos los refresh tokens del usuario via Firebase. El cliente debe descartar el refreshToken local y forzar re-login en todos los dispositivos.',
  })
  @ApiHeader({ name: 'X-Device-Id', required: true })
  @ApiHeader({ name: 'X-Device-Name', required: true })
  @ApiHeader({
    name: 'X-Platform',
    required: true,
    description: 'Plataforma del cliente. Valores permitidos: ios | android',
  })
  @ApiHeader({
    name: 'X-App-Version',
    required: false,
    description: 'Version semver de la app (ej. 1.2.3)',
  })
  @ApiResponse({
    status: 204,
    description: 'Contraseña actualizada. Cliente debe re-loguear.',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos invalidos',
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Contraseña actual invalida',
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 422,
    description: 'Contraseña nueva invalida',
    type: ApiValidationErrorResponse,
  })
  async changePassword(
    @CurrentUserId() userId: string,
    @Body() dto: ChangePasswordDto,
    @DeviceInfoHeaders() _device: DeviceInfo,
  ): Promise<void> {
    void _device;
    await this.changePasswordUseCase.execute({ userId, dto });
  }

  @Get('profile')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('jwt')
  @ApiOperation({
    summary: 'Obtener perfil del usuario autenticado',
    description:
      'Devuelve los datos canonicos del usuario en la BD (no Firebase). El JWT del Bearer identifica al usuario.',
  })
  @ApiHeader({ name: 'X-Device-Id', required: true })
  @ApiHeader({ name: 'X-Device-Name', required: true })
  @ApiHeader({
    name: 'X-Platform',
    required: true,
    description: 'Plataforma del cliente. Valores permitidos: ios | android',
  })
  @ApiHeader({
    name: 'X-App-Version',
    required: false,
    description: 'Version semver de la app (ej. 1.2.3)',
  })
  @ApiResponse({ status: 200, description: 'Perfil', type: UserResponseDto })
  @ApiResponse({
    status: 401,
    description: 'Token invalido o ausente',
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado',
    type: ApiErrorResponse,
  })
  async profile(
    @CurrentUserId() userId: string,
    @DeviceInfoHeaders() _device: DeviceInfo,
  ): Promise<UserResponseDto> {
    void _device;
    return this.getUserById.execute(userId);
  }

  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('jwt')
  @ApiOperation({
    summary: 'Actualizar datos del perfil',
    description:
      'Actualizacion parcial de campos del perfil. El email no es modificable por esta ruta (vinculado a Firebase Auth). Devuelve el DTO canonico actualizado.',
  })
  @ApiHeader({ name: 'X-Device-Id', required: true })
  @ApiHeader({ name: 'X-Device-Name', required: true })
  @ApiHeader({
    name: 'X-Platform',
    required: true,
    description: 'Plataforma del cliente. Valores permitidos: ios | android',
  })
  @ApiHeader({
    name: 'X-App-Version',
    required: false,
    description: 'Version semver de la app (ej. 1.2.3)',
  })
  @ApiResponse({
    status: 200,
    description: 'Perfil actualizado',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos invalidos',
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Token invalido o ausente',
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 422,
    description: 'Validacion fallida',
    type: ApiValidationErrorResponse,
  })
  async updateProfile(
    @CurrentUserId() userId: string,
    @Body() dto: UpdateProfileDto,
    @DeviceInfoHeaders() _device: DeviceInfo,
  ): Promise<UserResponseDto> {
    void _device;
    return this.updateProfileUseCase.execute({ userId, dto });
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('jwt')
  @ApiOperation({
    summary: 'Cerrar sesion del dispositivo actual',
    description:
      'Elimina la fila de user_devices asociada al user_id + X-Device-Id. El cliente debe descartar el accessToken y refreshToken local. Otros dispositivos del usuario permanecen activos.',
  })
  @ApiHeader({ name: 'X-Device-Id', required: true })
  @ApiHeader({ name: 'X-Device-Name', required: true })
  @ApiHeader({
    name: 'X-Platform',
    required: true,
    description: 'Plataforma del cliente. Valores permitidos: ios | android',
  })
  @ApiHeader({
    name: 'X-App-Version',
    required: false,
    description: 'Version semver de la app (ej. 1.2.3)',
  })
  @ApiResponse({ status: 204, description: 'Sesion cerrada' })
  @ApiResponse({
    status: 401,
    description: 'Token invalido o ausente',
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Dispositivo no registrado para el usuario',
    type: ApiErrorResponse,
  })
  async logout(
    @CurrentUserId() userId: string,
    @DeviceInfoHeaders() device: DeviceInfo,
  ): Promise<void> {
    await this.logoutUseCase.execute({ userId, deviceId: device.deviceId });
  }
}
