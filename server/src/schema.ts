
import { z } from 'zod';

// Travel Agency Settings Schema
export const travelAgencySettingsSchema = z.object({
  id: z.number(),
  name: z.string(),
  address: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type TravelAgencySettings = z.infer<typeof travelAgencySettingsSchema>;

export const createTravelAgencySettingsInputSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1)
});

export type CreateTravelAgencySettingsInput = z.infer<typeof createTravelAgencySettingsInputSchema>;

export const updateTravelAgencySettingsInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  address: z.string().min(1).optional()
});

export type UpdateTravelAgencySettingsInput = z.infer<typeof updateTravelAgencySettingsInputSchema>;

// Currency Conversion Schema
export const currencyConversionSchema = z.object({
  id: z.number(),
  currency_name: z.string(),
  conversion_rate: z.number(), // Rate to SAR (Riyal)
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type CurrencyConversion = z.infer<typeof currencyConversionSchema>;

export const createCurrencyConversionInputSchema = z.object({
  currency_name: z.string().min(1),
  conversion_rate: z.number().positive()
});

export type CreateCurrencyConversionInput = z.infer<typeof createCurrencyConversionInputSchema>;

export const updateCurrencyConversionInputSchema = z.object({
  id: z.number(),
  currency_name: z.string().min(1).optional(),
  conversion_rate: z.number().positive().optional()
});

export type UpdateCurrencyConversionInput = z.infer<typeof updateCurrencyConversionInputSchema>;

// Customer Schema
export const customerSchema = z.object({
  id: z.number(),
  name: z.string(),
  address: z.string(),
  phone: z.string(),
  email: z.string().email(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Customer = z.infer<typeof customerSchema>;

export const createCustomerInputSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email()
});

export type CreateCustomerInput = z.infer<typeof createCustomerInputSchema>;

export const updateCustomerInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  email: z.string().email().optional()
});

export type UpdateCustomerInput = z.infer<typeof updateCustomerInputSchema>;

// Room Type and Meal Package Enums
export const roomTypeEnum = z.enum(['Double', 'Triple', 'Quad']);
export type RoomType = z.infer<typeof roomTypeEnum>;

export const mealPackageEnum = z.enum(['Full Board', 'Half Board']);
export type MealPackage = z.infer<typeof mealPackageEnum>;

// Hotel Schema
export const hotelSchema = z.object({
  id: z.number(),
  name: z.string(),
  location: z.string(),
  room_type: roomTypeEnum,
  meal_package: mealPackageEnum,
  cost_price: z.number(), // HPP (Harga Pokok Pembelian)
  markup_percentage: z.number(), // Percentage markup
  selling_price: z.number(), // Calculated: cost_price + (markup_percentage * cost_price)
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Hotel = z.infer<typeof hotelSchema>;

export const createHotelInputSchema = z.object({
  name: z.string().min(1),
  location: z.string().min(1),
  room_type: roomTypeEnum,
  meal_package: mealPackageEnum,
  cost_price: z.number().positive(),
  markup_percentage: z.number().min(0)
});

export type CreateHotelInput = z.infer<typeof createHotelInputSchema>;

export const updateHotelInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  location: z.string().min(1).optional(),
  room_type: roomTypeEnum.optional(),
  meal_package: mealPackageEnum.optional(),
  cost_price: z.number().positive().optional(),
  markup_percentage: z.number().min(0).optional()
});

export type UpdateHotelInput = z.infer<typeof updateHotelInputSchema>;

// Service Schema
export const serviceSchema = z.object({
  id: z.number(),
  name: z.string(),
  cost_price: z.number(), // HPP (Harga Pokok Pembelian)
  markup_percentage: z.number(), // Percentage markup
  selling_price: z.number(), // Calculated: cost_price + (markup_percentage * cost_price)
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Service = z.infer<typeof serviceSchema>;

export const createServiceInputSchema = z.object({
  name: z.string().min(1),
  cost_price: z.number().positive(),
  markup_percentage: z.number().min(0)
});

export type CreateServiceInput = z.infer<typeof createServiceInputSchema>;

export const updateServiceInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  cost_price: z.number().positive().optional(),
  markup_percentage: z.number().min(0).optional()
});

export type UpdateServiceInput = z.infer<typeof updateServiceInputSchema>;

// Booking Schema
export const bookingSchema = z.object({
  id: z.number(),
  invoice_number: z.string(),
  customer_id: z.number(),
  hotel_id: z.number(),
  check_in_date: z.coerce.date(),
  check_out_date: z.coerce.date(),
  room_quantity: z.number().int().positive(),
  hotel_subtotal: z.number(),
  services_total: z.number(),
  total_amount: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Booking = z.infer<typeof bookingSchema>;

export const createBookingInputSchema = z.object({
  customer_id: z.number(),
  hotel_id: z.number(),
  check_in_date: z.string(), // ISO date string
  check_out_date: z.string(), // ISO date string
  room_quantity: z.number().int().positive(),
  services: z.array(z.object({
    service_id: z.number(),
    quantity: z.number().int().positive()
  })).optional()
});

export type CreateBookingInput = z.infer<typeof createBookingInputSchema>;

// Booking Service Schema (junction table)
export const bookingServiceSchema = z.object({
  id: z.number(),
  booking_id: z.number(),
  service_id: z.number(),
  quantity: z.number().int().positive(),
  unit_price: z.number(),
  total_price: z.number(),
  created_at: z.coerce.date()
});

export type BookingService = z.infer<typeof bookingServiceSchema>;

// Payment Method Enum
export const paymentMethodEnum = z.enum(['Cash', 'Bank Transfer', 'Credit Card', 'Other']);
export type PaymentMethod = z.infer<typeof paymentMethodEnum>;

// Payment Currency Enum
export const paymentCurrencyEnum = z.enum(['SAR', 'USD', 'IDR']);
export type PaymentCurrency = z.infer<typeof paymentCurrencyEnum>;

// Payment Schema
export const paymentSchema = z.object({
  id: z.number(),
  booking_id: z.number(),
  amount: z.number(),
  currency: paymentCurrencyEnum,
  amount_in_sar: z.number(), // Converted amount in SAR
  payment_method: paymentMethodEnum,
  payment_date: z.coerce.date(),
  created_at: z.coerce.date()
});

export type Payment = z.infer<typeof paymentSchema>;

export const createPaymentInputSchema = z.object({
  booking_id: z.number(),
  amount: z.number().positive(),
  currency: paymentCurrencyEnum,
  payment_method: paymentMethodEnum
});

export type CreatePaymentInput = z.infer<typeof createPaymentInputSchema>;

// Expense Schema
export const expenseSchema = z.object({
  id: z.number(),
  booking_id: z.number().nullable(), // Optional relation to booking
  name: z.string(),
  amount: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Expense = z.infer<typeof expenseSchema>;

export const createExpenseInputSchema = z.object({
  booking_id: z.number().optional(),
  name: z.string().min(1),
  amount: z.number().positive()
});

export type CreateExpenseInput = z.infer<typeof createExpenseInputSchema>;

export const updateExpenseInputSchema = z.object({
  id: z.number(),
  booking_id: z.number().nullable().optional(),
  name: z.string().min(1).optional(),
  amount: z.number().positive().optional()
});

export type UpdateExpenseInput = z.infer<typeof updateExpenseInputSchema>;

// User Role Enum
export const userRoleEnum = z.enum(['Administrator', 'Staff']);
export type UserRole = z.infer<typeof userRoleEnum>;

// User Schema
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  password_hash: z.string(),
  role: userRoleEnum,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

export const createUserInputSchema = z.object({
  username: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: userRoleEnum
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// Dashboard Stats Schema
export const dashboardStatsSchema = z.object({
  total_customers: z.number(),
  total_bookings: z.number(),
  total_profit: z.number(),
  unpaid_bookings: z.number()
});

export type DashboardStats = z.infer<typeof dashboardStatsSchema>;

// Report Schemas
export const profitLossReportSchema = z.object({
  invoice_number: z.string(),
  customer_name: z.string(),
  total_revenue: z.number(),
  total_cost: z.number(),
  profit: z.number(),
  booking_date: z.coerce.date()
});

export type ProfitLossReport = z.infer<typeof profitLossReportSchema>;

export const bookingsSummaryReportSchema = z.object({
  date: z.coerce.date(),
  total_bookings: z.number(),
  total_revenue: z.number(),
  total_rooms: z.number()
});

export type BookingsSummaryReport = z.infer<typeof bookingsSummaryReportSchema>;

export const unpaidInvoicesReportSchema = z.object({
  invoice_number: z.string(),
  customer_name: z.string(),
  total_amount: z.number(),
  paid_amount: z.number(),
  outstanding_balance: z.number(),
  booking_date: z.coerce.date()
});

export type UnpaidInvoicesReport = z.infer<typeof unpaidInvoicesReportSchema>;

// Query parameter schemas for reports
export const reportDateRangeInputSchema = z.object({
  start_date: z.string().optional(), // ISO date string
  end_date: z.string().optional() // ISO date string
});

export type ReportDateRangeInput = z.infer<typeof reportDateRangeInputSchema>;
