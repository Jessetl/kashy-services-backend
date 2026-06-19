import { ConflictException } from '../../../../shared-kernel/domain/exceptions/conflict.exception';

export class UserAlreadyExistsException extends ConflictException {
  constructor() {
    super('Ya existe una cuenta con ese correo.');
  }
}
