
import { serial, text, pgTable, timestamp, numeric, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const roomTypeEnum = pgEnum('room_type', ['Double', 'Triple', 'Quad']);
export const mealPackageEnum = pgEnum('meal_package', ['Full Board', 'Half Board']);
export const paymentMethodEnum = pgEnum('payment_method', ['Cash', 'Bank Transfer', 'Credit Card', 'Other']);
export const paymentCurrencyEnum = pgEnum('payment_currency', ['SAR', 'USD', 'IDR']);
export const userRoleEnum = pgEnum('user_role', ['Administrator', 'Staff']);

// Travel Agency Settings Table
export const travelAgencySettingsTable = pgTable('travel_agency_settings', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  address: text('address').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Currency Conversion Table
export const currencyConversionsTable = pgTable('currency_conversions', {
  id: serial('id').primaryKey(),
  currency_name: text('currency_name').notNull(),
  conversion_rate: numeric('conversion_rate', { precision: 10, scale: 4 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Customers Table
export const customersTable = pgTable('customers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  address: text('address').notNull(),
  phone: text('phone').notNull(),
  email: text('email').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Hotels Table
export const hotelsTable = pgTable('hotels', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  location: text('location').notNull(),
  room_type: roomTypeEnum('room_type').notNull(),
  meal_package: mealPackageEnum('meal_package').notNull(),
  cost_price: numeric('cost_price', { precision: 10, scale: 2 }).notNull(),
  markup_percentage: numeric('markup_percentage', { precision: 5, scale: 2 }).notNull(),
  selling_price: numeric('selling_price', { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Services Table
export const servicesTable = pgTable('services', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  cost_price: numeric('cost_price', { precision: 10, scale: 2 }).notNull(),
  markup_percentage: numeric('markup_percentage', { precision: 5, scale: 2 }).notNull(),
  selling_price: numeric('selling_price', { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Bookings Table
export const bookingsTable = pgTable('bookings', {
  id: serial('id').primaryKey(),
  invoice_number: text('invoice_number').notNull().unique(),
  customer_id: integer('customer_id').references(() => customersTable.id).notNull(),
  hotel_id: integer('hotel_id').references(() => hotelsTable.id).notNull(),
  check_in_date: timestamp('check_in_date').notNull(),
  check_out_date: timestamp('check_out_date').notNull(),
  room_quantity: integer('room_quantity').notNull(),
  hotel_subtotal: numeric('hotel_subtotal', { precision: 10, scale: 2 }).notNull(),
  services_total: numeric('services_total', { precision: 10, scale: 2 }).notNull(),
  total_amount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Booking Services Table (Junction Table)
export const bookingServicesTable = pgTable('booking_services', {
  id: serial('id').primaryKey(),
  booking_id: integer('booking_id').references(() => bookingsTable.id).notNull(),
  service_id: integer('service_id').references(() => servicesTable.id).notNull(),
  quantity: integer('quantity').notNull(),
  unit_price: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  total_price: numeric('total_price', { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Payments Table
export const paymentsTable = pgTable('payments', {
  id: serial('id').primaryKey(),
  booking_id: integer('booking_id').references(() => bookingsTable.id).notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  currency: paymentCurrencyEnum('currency').notNull(),
  amount_in_sar: numeric('amount_in_sar', { precision: 10, scale: 2 }).notNull(),
  payment_method: paymentMethodEnum('payment_method').notNull(),
  payment_date: timestamp('payment_date').defaultNow().notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Expenses Table
export const expensesTable = pgTable('expenses', {
  id: serial('id').primaryKey(),
  booking_id: integer('booking_id').references(() => bookingsTable.id),
  name: text('name').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Users Table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const customersRelations = relations(customersTable, ({ many }) => ({
  bookings: many(bookingsTable),
}));

export const hotelsRelations = relations(hotelsTable, ({ many }) => ({
  bookings: many(bookingsTable),
}));

export const servicesRelations = relations(servicesTable, ({ many }) => ({
  bookingServices: many(bookingServicesTable),
}));

export const bookingsRelations = relations(bookingsTable, ({ one, many }) => ({
  customer: one(customersTable, {
    fields: [bookingsTable.customer_id],
    references: [customersTable.id],
  }),
  hotel: one(hotelsTable, {
    fields: [bookingsTable.hotel_id],
    references: [hotelsTable.id],
  }),
  bookingServices: many(bookingServicesTable),
  payments: many(paymentsTable),
  expenses: many(expensesTable),
}));

export const bookingServicesRelations = relations(bookingServicesTable, ({ one }) => ({
  booking: one(bookingsTable, {
    fields: [bookingServicesTable.booking_id],
    references: [bookingsTable.id],
  }),
  service: one(servicesTable, {
    fields: [bookingServicesTable.service_id],
    references: [servicesTable.id],
  }),
}));

export const paymentsRelations = relations(paymentsTable, ({ one }) => ({
  booking: one(bookingsTable, {
    fields: [paymentsTable.booking_id],
    references: [bookingsTable.id],
  }),
}));

export const expensesRelations = relations(expensesTable, ({ one }) => ({
  booking: one(bookingsTable, {
    fields: [expensesTable.booking_id],
    references: [bookingsTable.id],
  }),
}));

// Export all tables for relation queries
export const tables = {
  travelAgencySettings: travelAgencySettingsTable,
  currencyConversions: currencyConversionsTable,
  customers: customersTable,
  hotels: hotelsTable,
  services: servicesTable,
  bookings: bookingsTable,
  bookingServices: bookingServicesTable,
  payments: paymentsTable,
  expenses: expensesTable,
  users: usersTable,
};
