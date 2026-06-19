import { Matches, ValidationOptions } from 'class-validator';

/**
 * Validadores reutilizables para DTOs.
 */

// Letra inicial, luego letras/marcas combinantes/espacio/'.- .
// Rechaza emoji, digitos y simbolos. Permite unicode de cualquier idioma.
const PERSON_NAME = /^\p{L}[\p{L}\p{M} '.-]*$/u;

/** Valida nombres de persona. Aplicar despues de @NormalizeName(). */
export const IsPersonName = (options?: ValidationOptions) =>
  Matches(PERSON_NAME, {
    message: "El nombre solo admite letras, espacios y . - '",
    ...options,
  });
