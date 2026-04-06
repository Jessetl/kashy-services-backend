import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../../shared-kernel/infrastructure/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../../../shared-kernel/infrastructure/pipes/parse-uuid.pipe';
import type { FirebaseUser } from '../../../../shared-kernel/infrastructure/guards/firebase-auth.guard';
import { SyncFirebaseUserUseCase } from '../../../users/application/use-cases/sync-firebase-user.use-case';
import { CreateShoppingListUseCase } from '../../application/use-cases/create-shopping-list.use-case';
import { GetShoppingListsUseCase } from '../../application/use-cases/get-shopping-lists.use-case';
import { GetShoppingListByIdUseCase } from '../../application/use-cases/get-shopping-list-by-id.use-case';
import { UpdateShoppingListUseCase } from '../../application/use-cases/update-shopping-list.use-case';
import { DeleteShoppingListUseCase } from '../../application/use-cases/delete-shopping-list.use-case';
import { AddItemsToShoppingListUseCase } from '../../application/use-cases/add-items-to-shopping-list.use-case';
import { EditShoppingItemUseCase } from '../../application/use-cases/edit-shopping-item.use-case';
import { DeleteShoppingItemUseCase } from '../../application/use-cases/delete-shopping-item.use-case';
import { ToggleShoppingItemUseCase } from '../../application/use-cases/toggle-shopping-item.use-case';
import { CompleteShoppingListUseCase } from '../../application/use-cases/complete-shopping-list.use-case';
import { GetShoppingListHistoryUseCase } from '../../application/use-cases/get-shopping-list-history.use-case';
import { DuplicateShoppingListUseCase } from '../../application/use-cases/duplicate-shopping-list.use-case';
import { CompareShoppingListsUseCase } from '../../application/use-cases/compare-shopping-lists.use-case';
import { GetSpendingStatsUseCase } from '../../application/use-cases/get-spending-stats.use-case';
import { CreateShoppingListDto } from '../../application/dtos/create-shopping-list.dto';
import { AddShoppingItemsDto } from '../../application/dtos/add-shopping-items.dto';
import { EditShoppingItemDto } from '../../application/dtos/edit-shopping-item.dto';
import { UpdateShoppingListDto } from '../../application/dtos/update-shopping-list.dto';
import { DeleteShoppingListResponseDto } from '../../application/dtos/delete-shopping-list-response.dto';
import { ShoppingListResponseDto } from '../../application/dtos/shopping-list-response.dto';
import { ShoppingItemResponseDto } from '../../application/dtos/shopping-item-response.dto';
import { PaginatedShoppingListsResponseDto } from '../../application/dtos/paginated-shopping-lists-response.dto';
import { CompareShoppingListsResponseDto } from '../../application/dtos/compare-shopping-lists-response.dto';
import { SpendingStatsResponseDto } from '../../application/dtos/spending-stats-response.dto';

@ApiTags('Shopping Lists')
@ApiBearerAuth('firebase-token')
@Controller('shopping-lists')
export class ShoppingListsController {
  constructor(
    private readonly createShoppingList: CreateShoppingListUseCase,
    private readonly getShoppingLists: GetShoppingListsUseCase,
    private readonly getShoppingListById: GetShoppingListByIdUseCase,
    private readonly updateShoppingList: UpdateShoppingListUseCase,
    private readonly deleteShoppingList: DeleteShoppingListUseCase,
    private readonly addItemsToShoppingList: AddItemsToShoppingListUseCase,
    private readonly editShoppingItem: EditShoppingItemUseCase,
    private readonly deleteShoppingItem: DeleteShoppingItemUseCase,
    private readonly toggleShoppingItem: ToggleShoppingItemUseCase,
    private readonly completeShoppingList: CompleteShoppingListUseCase,
    private readonly getShoppingListHistory: GetShoppingListHistoryUseCase,
    private readonly duplicateShoppingList: DuplicateShoppingListUseCase,
    private readonly compareShoppingLists: CompareShoppingListsUseCase,
    private readonly getSpendingStats: GetSpendingStatsUseCase,
    private readonly syncFirebaseUser: SyncFirebaseUserUseCase,
  ) {}

  // ──────────────────────────────────────────────
  //  Listas
  // ──────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear lista de compras con items opcionales' })
  @ApiResponse({
    status: 201,
    description: 'Lista creada exitosamente',
    type: ShoppingListResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Datos de entrada invalidos' })
  @ApiResponse({ status: 401, description: 'Token invalido o ausente' })
  async create(
    @CurrentUser() firebaseUser: FirebaseUser,
    @Body() dto: CreateShoppingListDto,
  ) {
    const userId = await this.resolveUserId(firebaseUser);
    return this.createShoppingList.execute({ userId, dto });
  }

  @Get('history')
  @ApiOperation({
    summary: 'Historial de listas completadas (paginado)',
  })
  @ApiQuery({ name: 'page', required: false, example: 1, type: Number })
  @ApiQuery({ name: 'limit', required: false, example: 10, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Historial paginado de listas completadas',
    type: PaginatedShoppingListsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Token invalido o ausente' })
  async history(
    @CurrentUser() firebaseUser: FirebaseUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = await this.resolveUserId(firebaseUser);
    return this.getShoppingListHistory.execute({
      userId,
      page: Math.max(1, Number(page) || 1),
      limit: Math.min(50, Math.max(1, Number(limit) || 10)),
    });
  }

  @Get('compare')
  @ApiOperation({
    summary: 'Comparar precios entre listas',
    description:
      'Compara productos con el mismo nombre entre 2 o mas listas seleccionadas.',
  })
  @ApiQuery({
    name: 'ids',
    required: true,
    description: 'UUIDs de las listas separados por coma',
    example: 'uuid-1,uuid-2',
  })
  @ApiResponse({
    status: 200,
    description: 'Comparacion de precios por producto',
    type: CompareShoppingListsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Token invalido o ausente' })
  async compare(
    @CurrentUser() firebaseUser: FirebaseUser,
    @Query('ids') ids: string,
  ) {
    const userId = await this.resolveUserId(firebaseUser);
    const listIds = (ids ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    return this.compareShoppingLists.execute({ ids: listIds, userId });
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Estadisticas de gasto por periodo',
    description:
      'Agrega gasto total VES/USD de listas completadas por semana o mes.',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['week', 'month'],
    example: 'month',
  })
  @ApiResponse({
    status: 200,
    description: 'Estadisticas de gasto',
    type: SpendingStatsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Token invalido o ausente' })
  async stats(
    @CurrentUser() firebaseUser: FirebaseUser,
    @Query('period') period?: string,
  ) {
    const userId = await this.resolveUserId(firebaseUser);
    const validPeriod = period === 'week' ? 'week' : 'month';
    return this.getSpendingStats.execute({ userId, period: validPeriod });
  }

  @Get()
  @ApiOperation({ summary: 'Listar listas activas del usuario' })
  @ApiResponse({
    status: 200,
    description: 'Listas activas del usuario',
    type: [ShoppingListResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Token invalido o ausente' })
  async findAll(@CurrentUser() firebaseUser: FirebaseUser) {
    const userId = await this.resolveUserId(firebaseUser);
    return this.getShoppingLists.execute(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de una lista de compras' })
  @ApiParam({
    name: 'id',
    description: 'UUID de la lista de compras',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalle de la lista',
    type: ShoppingListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Token invalido o ausente' })
  @ApiResponse({ status: 404, description: 'Lista no encontrada' })
  async findOne(
    @CurrentUser() firebaseUser: FirebaseUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const userId = await this.resolveUserId(firebaseUser);
    return this.getShoppingListById.execute({ listId: id, userId });
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Editar lista y/o sus items',
    description:
      'Actualiza metadatos de la lista (nombre, tienda, IVA) y opcionalmente sus items. ' +
      'Items con id se actualizan, sin id se crean como nuevos. ' +
      'Items existentes no incluidos en el array se eliminan. ' +
      'Si no se envia el campo items, los items existentes se mantienen sin cambios. ' +
      'Los precios USD se calculan automaticamente si no se envian.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la lista de compras',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista actualizada',
    type: ShoppingListResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Datos de entrada invalidos' })
  @ApiResponse({ status: 401, description: 'Token invalido o ausente' })
  @ApiResponse({ status: 404, description: 'Lista no encontrada' })
  async update(
    @CurrentUser() firebaseUser: FirebaseUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateShoppingListDto,
  ) {
    const userId = await this.resolveUserId(firebaseUser);
    return this.updateShoppingList.execute({ listId: id, userId, dto });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar lista de compras' })
  @ApiParam({
    name: 'id',
    description: 'UUID de la lista de compras',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista eliminada exitosamente',
    type: DeleteShoppingListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Token invalido o ausente' })
  @ApiResponse({ status: 404, description: 'Lista no encontrada' })
  async remove(
    @CurrentUser() firebaseUser: FirebaseUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const userId = await this.resolveUserId(firebaseUser);
    return this.deleteShoppingList.execute({ listId: id, userId });
  }

  @Post(':id/duplicate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Duplicar lista existente',
    description:
      'Crea una copia de la lista con status ACTIVE y todos sus items (sin marcar como comprados).',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la lista a duplicar',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 201,
    description: 'Lista duplicada exitosamente',
    type: ShoppingListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Token invalido o ausente' })
  @ApiResponse({ status: 404, description: 'Lista no encontrada' })
  async duplicate(
    @CurrentUser() firebaseUser: FirebaseUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const userId = await this.resolveUserId(firebaseUser);
    return this.duplicateShoppingList.execute({ listId: id, userId });
  }

  @Put(':id/complete')
  @ApiOperation({
    summary: 'Cerrar lista (marcar como completada)',
    description:
      'Cambia el status a COMPLETED y guarda un snapshot de la tasa de cambio vigente.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la lista a completar',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista completada exitosamente',
    type: ShoppingListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Token invalido o ausente' })
  @ApiResponse({ status: 404, description: 'Lista no encontrada' })
  async complete(
    @CurrentUser() firebaseUser: FirebaseUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const userId = await this.resolveUserId(firebaseUser);
    return this.completeShoppingList.execute({ listId: id, userId });
  }

  // ──────────────────────────────────────────────
  //  Items
  // ──────────────────────────────────────────────

  @Post(':id/items')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Agregar productos a una lista existente' })
  @ApiParam({
    name: 'id',
    description: 'UUID de la lista de compras',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 201,
    description: 'Productos agregados exitosamente',
    type: [ShoppingItemResponseDto],
  })
  @ApiResponse({ status: 400, description: 'Datos de entrada invalidos' })
  @ApiResponse({ status: 401, description: 'Token invalido o ausente' })
  @ApiResponse({ status: 404, description: 'Lista no encontrada' })
  async addItems(
    @CurrentUser() firebaseUser: FirebaseUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddShoppingItemsDto,
  ) {
    const userId = await this.resolveUserId(firebaseUser);
    return this.addItemsToShoppingList.execute({
      listId: id,
      userId,
      items: dto.items,
    });
  }

  @Put(':id/items/:itemId')
  @ApiOperation({
    summary: 'Editar producto de una lista',
    description:
      'Actualiza nombre, precio, cantidad y/o estado de compra de un producto existente.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la lista de compras',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiParam({
    name: 'itemId',
    description: 'UUID del producto',
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  })
  @ApiResponse({
    status: 200,
    description: 'Producto actualizado exitosamente',
    type: ShoppingListResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Datos de entrada invalidos' })
  @ApiResponse({ status: 401, description: 'Token invalido o ausente' })
  @ApiResponse({ status: 404, description: 'Lista o producto no encontrado' })
  async editItem(
    @CurrentUser() firebaseUser: FirebaseUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: EditShoppingItemDto,
  ) {
    const userId = await this.resolveUserId(firebaseUser);
    return this.editShoppingItem.execute({ listId: id, itemId, userId, dto });
  }

  @Delete(':id/items/:itemId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar producto de una lista' })
  @ApiParam({
    name: 'id',
    description: 'UUID de la lista de compras',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiParam({
    name: 'itemId',
    description: 'UUID del producto',
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  })
  @ApiResponse({
    status: 200,
    description: 'Producto eliminado exitosamente',
    type: ShoppingListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Token invalido o ausente' })
  @ApiResponse({ status: 404, description: 'Lista o producto no encontrado' })
  async removeItem(
    @CurrentUser() firebaseUser: FirebaseUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    const userId = await this.resolveUserId(firebaseUser);
    return this.deleteShoppingItem.execute({ listId: id, itemId, userId });
  }

  @Put(':id/items/:itemId/toggle')
  @ApiOperation({
    summary: 'Marcar/desmarcar producto como comprado',
    description: 'Alterna el estado is_purchased del producto.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la lista de compras',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiParam({
    name: 'itemId',
    description: 'UUID del producto',
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado de compra actualizado',
    type: ShoppingListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Token invalido o ausente' })
  @ApiResponse({ status: 404, description: 'Lista o producto no encontrado' })
  async toggleItem(
    @CurrentUser() firebaseUser: FirebaseUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    const userId = await this.resolveUserId(firebaseUser);
    return this.toggleShoppingItem.execute({ listId: id, itemId, userId });
  }

  // ──────────────────────────────────────────────
  //  Helpers
  // ──────────────────────────────────────────────

  private async resolveUserId(firebaseUser: FirebaseUser): Promise<string> {
    const email = firebaseUser.email?.trim();
    const hasValidEmail =
      typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!firebaseUser.uid || !hasValidEmail) {
      throw new UnauthorizedException('Invalid Firebase token payload');
    }

    const user = await this.syncFirebaseUser.execute({
      firebaseUid: firebaseUser.uid,
      email,
    });
    return user.id;
  }
}
