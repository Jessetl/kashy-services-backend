/**
 * Configuración de monedas locales por país para dolarapi.com.
 *
 * Las URLs pueden sobreescribirse desde el .env con variables DOLAR_API_URL_<COUNTRY>.
 * Ejemplo: DOLAR_API_URL_VE=https://ve.dolarapi.com/v1/dolares/oficial
 *
 * rateField: campo del JSON de respuesta que contiene el tipo de cambio a usar.
 */

export interface CountryCurrencyConfig {
  country: string;
  currency: string;
  currencyName: string;
  apiUrl: string;
  rateField: 'promedio' | 'venta' | 'compra';
}

const DEFAULTS: Record<
  string,
  Omit<CountryCurrencyConfig, 'apiUrl'> & { defaultUrl: string }
> = {
  VE: {
    country: 'VE',
    currency: 'VES',
    currencyName: 'Bolívar venezolano',
    defaultUrl: 'https://ve.dolarapi.com/v1/dolares/oficial',
    rateField: 'promedio',
  },
  AR: {
    country: 'AR',
    currency: 'ARS',
    currencyName: 'Peso argentino',
    defaultUrl: 'https://ar.dolarapi.com/v1/dolares/oficial',
    rateField: 'compra',
  },
  CL: {
    country: 'CL',
    currency: 'CLP',
    currencyName: 'Peso chileno',
    defaultUrl: 'https://cl.dolarapi.com/v1/cotizaciones/usd',
    rateField: 'compra',
  },
  CO: {
    country: 'CO',
    currency: 'COP',
    currencyName: 'Peso colombiano',
    defaultUrl: 'https://co.dolarapi.com/v1/cotizaciones/usd',
    rateField: 'compra',
  },
};

export const DEFAULT_COUNTRY = 'VE';

/**
 * Resuelve la configuración para un país.
 * La URL se lee de process.env en cada llamada para respetar el valor actual del entorno.
 */
export function getCurrencyConfig(country: string): CountryCurrencyConfig {
  const key = country.toUpperCase();
  const entry = DEFAULTS[key] ?? DEFAULTS[DEFAULT_COUNTRY];

  const envUrl = process.env[`DOLAR_API_URL_${entry.country}`];

  return {
    country: entry.country,
    currency: entry.currency,
    currencyName: entry.currencyName,
    rateField: entry.rateField,
    apiUrl: envUrl ?? entry.defaultUrl,
  };
}
