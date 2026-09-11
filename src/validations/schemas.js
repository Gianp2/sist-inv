import { z } from 'zod';

export const customerSchema = z.object({
  name: z.string().min(2, 'El nombre completo es obligatorio'),
  dni: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export const supplierSchema = z.object({
  name: z.string().min(2, 'La razón social o nombre es obligatorio'),
  cuit: z.string().optional(),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  address: z.string().optional(),
  category: z.string().optional(),
});

export const cashMovementSchema = z.object({
  type: z.enum(['INGRESO', 'EGRESO', 'RETIRO_CAJA', 'AJUSTE']),
  amount: z.number().positive('El monto debe ser mayor a 0'),
  description: z.string().min(3, 'La descripción es obligatoria'),
});

export const userFormSchema = z.object({
  displayName: z.string().min(2, 'El nombre es obligatorio'),
  email: z.string().email('Email no válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').optional(),
  role: z.enum(['ADMIN', 'SUPERVISOR', 'EMPLEADO']),
  active: z.boolean().default(true),
});
