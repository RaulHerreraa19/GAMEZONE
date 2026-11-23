import { z } from 'zod';
import { PAY_METHODS } from '../types.js';

export const method = z.enum(PAY_METHODS, { message: 'Elige una forma de pago válida.' });

export const snackItems = z
  .array(
    z.object({
      productId: z.number().int().positive('Producto inválido.'),
      quantity: z.number().int('La cantidad debe ser un número entero.').min(1, 'La cantidad mínima es 1.').max(99, 'La cantidad máxima es 99.'),
    }),
  )
  .max(40, 'Son demasiados productos.');
