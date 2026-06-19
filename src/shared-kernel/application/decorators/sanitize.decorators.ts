import { Transform } from 'class-transformer';

/**
 * Decoradores de sanitizacion reutilizables para DTOs.
 * Componen @Transform; corren antes que las validaciones @Is* del ValidationPipe.
 * No-op si el valor no es string (deja que la validacion reporte el tipo).
 */

const apply = (fn: (v: string) => string) =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? fn(value) : value,
  );

/** Elimina espacios al inicio/final. */
export const Trim = () => apply((v) => v.trim());

/** Trim + minusculas. Ideal para emails. */
export const TrimLowercase = () => apply((v) => v.trim().toLowerCase());

/** Trim + mayusculas. Ideal para codigos ISO. */
export const TrimUppercase = () => apply((v) => v.trim().toUpperCase());

/** Trim + colapsa espacios internos multiples a uno. Ideal para nombres. */
export const CollapseSpaces = () => apply((v) => v.trim().replace(/\s+/g, ' '));

/**
 * Normaliza nombres de persona:
 * - NFC para unificar formas compuestas/descompuestas (é vs e + acento).
 * - Elimina caracteres invisibles/peligrosos: control (Cc) y formato (Cf:
 *   zero-width, BOM, overrides bidi RTL usados para spoofing/homograph).
 * - Colapsa espacios.
 * Permite acentos, CJK, arabe, etc. No filtra emoji — eso lo rechaza IsPersonName.
 */
const INVISIBLE = /[\p{Cc}\p{Cf}]/gu;
export const NormalizeName = () =>
  apply((v) =>
    v.normalize('NFC').replace(INVISIBLE, '').trim().replace(/\s+/g, ' '),
  );
