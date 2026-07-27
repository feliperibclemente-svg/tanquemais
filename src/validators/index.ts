import { z } from "zod";

export const vehicleSchema = z.object({
  nickname: z.string().trim().max(40).optional().or(z.literal("")),
  brand: z.string().trim().min(1, "Informe a marca").max(40),
  model: z.string().trim().min(1, "Informe o modelo").max(60),
  year: z.coerce
    .number()
    .int()
    .min(1950, "Ano inválido")
    .max(new Date().getFullYear() + 1, "Ano inválido")
    .optional(),
  engine: z.string().trim().max(20).optional().or(z.literal("")),
  plate: z
    .string()
    .trim()
    .max(8)
    .transform((v) => v.toUpperCase())
    .optional()
    .or(z.literal("")),
  color: z.string().trim().max(20).optional().or(z.literal("")),
  fuel_type_id: z.string().min(1, "Escolha o combustível"),
  tank_liters: z.coerce.number().min(10, "Tanque muito pequeno").max(500).optional(),
  current_odometer: z.coerce.number().min(0, "Quilometragem inválida").max(2_000_000),
});

export type VehicleInput = z.infer<typeof vehicleSchema>;

export const fuelingSchema = z
  .object({
    vehicle_id: z.string().uuid("Selecione um veículo"),
    station_id: z.string().uuid().nullable().optional(),
    fuel_type_id: z.string().min(1, "Escolha o combustível"),
    filled_at: z.string().min(1),
    liters: z.coerce.number().positive("Litros deve ser maior que zero").max(500),
    price_per_liter: z.coerce.number().positive("Preço inválido").max(50),
    total_cost: z.coerce.number().nonnegative().max(20_000),
    odometer: z.coerce.number().nonnegative("Quilometragem inválida").max(2_000_000),
    full_tank: z.boolean(),
    note: z.string().trim().max(500).optional().or(z.literal("")),
    photo_url: z.string().url().nullable().optional(),
  })
  .refine((v) => v.total_cost > 0, { message: "Informe o valor abastecido", path: ["total_cost"] });

export type FuelingInput = z.infer<typeof fuelingSchema>;

export const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Informe seu nome").max(60),
  username: z
    .string()
    .trim()
    .min(3, "Mínimo de 3 caracteres")
    .max(20)
    .regex(/^[a-z0-9._]+$/, "Use apenas letras minúsculas, números, ponto ou _")
    .optional()
    .or(z.literal("")),
  bio: z.string().trim().max(160).optional().or(z.literal("")),
  city: z.string().trim().max(60).optional().or(z.literal("")),
  state: z.string().trim().max(2).optional().or(z.literal("")),
  visibility: z.enum(["public", "friends", "private"]),
  hide_odometer: z.boolean(),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export const commentSchema = z.object({
  content: z.string().trim().min(1, "Escreva algo").max(1000),
});

export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional().or(z.literal("")),
});

export const authSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(8, "Mínimo de 8 caracteres").max(72),
});
