import { Router } from 'express';
import { z } from 'zod';
import { requireAdmin, requireAuth } from '../lib/auth.js';
import { PRODUCT_ICON_KEYS } from '../types.js';
import { createProduct, listProducts, updateProduct } from '../services/products.js';

export const productsRouter = Router();
productsRouter.use('/products', requireAuth);

const name = z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres.').max(40, 'El nombre es demasiado largo.');
const icon = z.enum(PRODUCT_ICON_KEYS, { message: 'Elige un icono de la lista.' });
const priceCents =z.number({ message: 'Escribe el precio.' }).int('El precio no es válido.').min(1, 'El precio debe ser mayor a cero.').max(1_000_000, 'El precio es demasiado alto.');
const stock = z.number({ message: 'Escribe las existencias.' }).int('Las existencias deben ser un número entero.').min(0, 'Las existencias no pueden ser negativas.').max(100_000, 'Las existencias son demasiadas.');

// Every signed-in user needs the list to sell; only admins change the catalog or the stock.
productsRouter.get('/products', async (_req, res) => {
  res.json(await listProducts());
});

productsRouter.post('/products', requireAdmin, async (req, res) => {
  const body = z.object({ name, icon, priceCents, stock }).parse(req.body);
  res.status(201).json(await createProduct(res.locals.employee, body));
});

productsRouter.patch('/products/:id', requireAdmin, async (req, res) => {
  const body = z
    .object({ name: name.optional(), icon: icon.optional(), priceCents: priceCents.optional(), stock: stock.optional(), active: z.boolean().optional() })
    .parse(req.body);
  const id = z.coerce.number({ message: 'Producto inválido.' }).int().positive('Producto inválido.').parse(req.params.id);
  res.json(await updateProduct(res.locals.employee, id, body));
});
