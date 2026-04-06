import { NotFoundException } from '../../../../shared-kernel/domain/exceptions/not-found.exception';

export class ShoppingItemNotFoundException extends NotFoundException {
  constructor(id: string) {
    super('ShoppingItem', id);
  }
}
