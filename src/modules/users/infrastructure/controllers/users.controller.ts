import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../../shared-kernel/infrastructure/decorators/current-user.decorator.js';
import { Public } from '../../../../shared-kernel/infrastructure/decorators/public.decorator.js';
import { ParseUUIDPipe } from '../../../../shared-kernel/infrastructure/pipes/parse-uuid.pipe.js';
import { SyncFirebaseUserUseCase } from '../../application/use-cases/sync-firebase-user.use-case.js';
import { GetUserByIdUseCase } from '../../application/use-cases/get-user-by-id.use-case.js';
import { RegisterUserUseCase } from '../../application/use-cases/register-user.use-case.js';
import { LoginUserUseCase } from '../../application/use-cases/login-user.use-case.js';
import { RefreshUserTokenUseCase } from '../../application/use-cases/refresh-user-token.use-case.js';
import { RegisterUserDto } from '../../application/dtos/register-user.dto.js';
import { LoginUserDto } from '../../application/dtos/login-user.dto.js';
import { RefreshTokenDto } from '../../application/dtos/refresh-token.dto.js';
import { UserResponseDto } from '../../application/dtos/user-response.dto.js';
import { LoginResponseDto } from '../../application/dtos/login-response.dto.js';
import type { FirebaseUser } from '../../../../shared-kernel/infrastructure/guards/firebase-auth.guard.js';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly syncFirebaseUser: SyncFirebaseUserUseCase,
    private readonly getUserById: GetUserByIdUseCase,
    private readonly registerUser: RegisterUserUseCase,
    private readonly loginUser: LoginUserUseCase,
    private readonly refreshUserToken: RefreshUserTokenUseCase,
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
    return this.syncFirebaseUser.execute({
      firebaseUid: user.uid,
      email: user.email || '',
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
