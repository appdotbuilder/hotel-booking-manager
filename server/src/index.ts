
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import all schemas
import {
  createTravelAgencySettingsInputSchema,
  updateTravelAgencySettingsInputSchema,
  createCurrencyConversionInputSchema,
  updateCurrencyConversionInputSchema,
  createCustomerInputSchema,
  updateCustomerInputSchema,
  createHotelInputSchema,
  updateHotelInputSchema,
  createServiceInputSchema,
  updateServiceInputSchema,
  createBookingInputSchema,
  createPaymentInputSchema,
  createExpenseInputSchema,
  updateExpenseInputSchema,
  createUserInputSchema,
  reportDateRangeInputSchema
} from './schema';

// Import all handlers
import { createTravelAgencySettings } from './handlers/create_travel_agency_settings';
import { getTravelAgencySettings } from './handlers/get_travel_agency_settings';
import { updateTravelAgencySettings } from './handlers/update_travel_agency_settings';
import { createCurrencyConversion } from './handlers/create_currency_conversion';
import { getCurrencyConversions } from './handlers/get_currency_conversions';
import { updateCurrencyConversion } from './handlers/update_currency_conversion';
import { deleteCurrencyConversion } from './handlers/delete_currency_conversion';
import { createCustomer } from './handlers/create_customer';
import { getCustomers } from './handlers/get_customers';
import { getCustomer } from './handlers/get_customer';
import { updateCustomer } from './handlers/update_customer';
import { deleteCustomer } from './handlers/delete_customer';
import { createHotel } from './handlers/create_hotel';
import { getHotels } from './handlers/get_hotels';
import { getHotel } from './handlers/get_hotel';
import { updateHotel } from './handlers/update_hotel';
import { deleteHotel } from './handlers/delete_hotel';
import { createService } from './handlers/create_service';
import { getServices } from './handlers/get_services';
import { getService } from './handlers/get_service';
import { updateService } from './handlers/update_service';
import { deleteService } from './handlers/delete_service';
import { createBooking } from './handlers/create_booking';
import { getBookings } from './handlers/get_bookings';
import { getBooking } from './handlers/get_booking';
import { getBookingByInvoice } from './handlers/get_booking_by_invoice';
import { updateBooking } from './handlers/update_booking';
import { deleteBooking } from './handlers/delete_booking';
import { createPayment } from './handlers/create_payment';
import { getPaymentsByBooking } from './handlers/get_payments_by_booking';
import { getBookingPaymentStatus } from './handlers/get_booking_payment_status';
import { createExpense } from './handlers/create_expense';
import { getExpenses } from './handlers/get_expenses';
import { updateExpense } from './handlers/update_expense';
import { deleteExpense } from './handlers/delete_expense';
import { getDashboardStats } from './handlers/get_dashboard_stats';
import { getProfitLossReport } from './handlers/get_profit_loss_report';
import { getBookingsSummaryReport } from './handlers/get_bookings_summary_report';
import { getUnpaidInvoicesReport } from './handlers/get_unpaid_invoices_report';
import { createUser } from './handlers/create_user';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Travel Agency Settings
  createTravelAgencySettings: publicProcedure
    .input(createTravelAgencySettingsInputSchema)
    .mutation(({ input }) => createTravelAgencySettings(input)),
  getTravelAgencySettings: publicProcedure
    .query(() => getTravelAgencySettings()),
  updateTravelAgencySettings: publicProcedure
    .input(updateTravelAgencySettingsInputSchema)
    .mutation(({ input }) => updateTravelAgencySettings(input)),

  // Currency Conversions
  createCurrencyConversion: publicProcedure
    .input(createCurrencyConversionInputSchema)
    .mutation(({ input }) => createCurrencyConversion(input)),
  getCurrencyConversions: publicProcedure
    .query(() => getCurrencyConversions()),
  updateCurrencyConversion: publicProcedure
    .input(updateCurrencyConversionInputSchema)
    .mutation(({ input }) => updateCurrencyConversion(input)),
  deleteCurrencyConversion: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteCurrencyConversion(input)),

  // Customers
  createCustomer: publicProcedure
    .input(createCustomerInputSchema)
    .mutation(({ input }) => createCustomer(input)),
  getCustomers: publicProcedure
    .query(() => getCustomers()),
  getCustomer: publicProcedure
    .input(z.number())
    .query(({ input }) => getCustomer(input)),
  updateCustomer: publicProcedure
    .input(updateCustomerInputSchema)
    .mutation(({ input }) => updateCustomer(input)),
  deleteCustomer: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteCustomer(input)),

  // Hotels
  createHotel: publicProcedure
    .input(createHotelInputSchema)
    .mutation(({ input }) => createHotel(input)),
  getHotels: publicProcedure
    .query(() => getHotels()),
  getHotel: publicProcedure
    .input(z.number())
    .query(({ input }) => getHotel(input)),
  updateHotel: publicProcedure
    .input(updateHotelInputSchema)
    .mutation(({ input }) => updateHotel(input)),
  deleteHotel: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteHotel(input)),

  // Services
  createService: publicProcedure
    .input(createServiceInputSchema)
    .mutation(({ input }) => createService(input)),
  getServices: publicProcedure
    .query(() => getServices()),
  getService: publicProcedure
    .input(z.number())
    .query(({ input }) => getService(input)),
  updateService: publicProcedure
    .input(updateServiceInputSchema)
    .mutation(({ input }) => updateService(input)),
  deleteService: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteService(input)),

  // Bookings
  createBooking: publicProcedure
    .input(createBookingInputSchema)
    .mutation(({ input }) => createBooking(input)),
  getBookings: publicProcedure
    .query(() => getBookings()),
  getBooking: publicProcedure
    .input(z.number())
    .query(({ input }) => getBooking(input)),
  getBookingByInvoice: publicProcedure
    .input(z.string())
    .query(({ input }) => getBookingByInvoice(input)),
  updateBooking: publicProcedure
    .input(z.object({
      id: z.number(),
      data: createBookingInputSchema.partial()
    }))
    .mutation(({ input }) => updateBooking(input.id, input.data)),
  deleteBooking: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteBooking(input)),

  // Payments
  createPayment: publicProcedure
    .input(createPaymentInputSchema)
    .mutation(({ input }) => createPayment(input)),
  getPaymentsByBooking: publicProcedure
    .input(z.number())
    .query(({ input }) => getPaymentsByBooking(input)),
  getBookingPaymentStatus: publicProcedure
    .input(z.number())
    .query(({ input }) => getBookingPaymentStatus(input)),

  // Expenses
  createExpense: publicProcedure
    .input(createExpenseInputSchema)
    .mutation(({ input }) => createExpense(input)),
  getExpenses: publicProcedure
    .query(() => getExpenses()),
  updateExpense: publicProcedure
    .input(updateExpenseInputSchema)
    .mutation(({ input }) => updateExpense(input)),
  deleteExpense: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteExpense(input)),

  // Dashboard & Reports
  getDashboardStats: publicProcedure
    .query(() => getDashboardStats()),
  getProfitLossReport: publicProcedure
    .input(reportDateRangeInputSchema.optional())
    .query(({ input }) => getProfitLossReport(input)),
  getBookingsSummaryReport: publicProcedure
    .input(reportDateRangeInputSchema.optional())
    .query(({ input }) => getBookingsSummaryReport(input)),
  getUnpaidInvoicesReport: publicProcedure
    .query(() => getUnpaidInvoicesReport()),

  // Users
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
