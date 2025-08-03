
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, hotelsTable, bookingsTable, paymentsTable, currencyConversionsTable } from '../db/schema';
import { type CreateCustomerInput, type CreateHotelInput, type CreateBookingInput, type CreatePaymentInput, type CreateCurrencyConversionInput } from '../schema';
import { getPaymentsByBooking } from '../handlers/get_payments_by_booking';
import { eq } from 'drizzle-orm';

// Test data
const testCustomer: CreateCustomerInput = {
  name: 'John Doe',
  address: '123 Main St',
  phone: '+1234567890',
  email: 'john@example.com'
};

const testHotel: CreateHotelInput = {
  name: 'Test Hotel',
  location: 'Mecca',
  room_type: 'Double',
  meal_package: 'Full Board',
  cost_price: 100.00,
  markup_percentage: 20.00
};

const testBooking: CreateBookingInput = {
  customer_id: 1,
  hotel_id: 1,
  check_in_date: '2024-01-15',
  check_out_date: '2024-01-20',
  room_quantity: 2
};

const testCurrencyConversion: CreateCurrencyConversionInput = {
  currency_name: 'USD',
  conversion_rate: 3.75
};

const testPayment1: CreatePaymentInput = {
  booking_id: 1,
  amount: 100.00,
  currency: 'USD',
  payment_method: 'Cash'
};

const testPayment2: CreatePaymentInput = {
  booking_id: 1,
  amount: 200.00,
  currency: 'SAR',
  payment_method: 'Bank Transfer'
};

const testPayment3: CreatePaymentInput = {
  booking_id: 2,
  amount: 150.00,
  currency: 'USD',
  payment_method: 'Credit Card'
};

describe('getPaymentsByBooking', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return payments for a specific booking', async () => {
    // Create prerequisite data
    await db.insert(currencyConversionsTable).values({
      currency_name: testCurrencyConversion.currency_name,
      conversion_rate: testCurrencyConversion.conversion_rate.toString()
    });

    const customer = await db.insert(customersTable).values(testCustomer).returning();
    
    const hotel = await db.insert(hotelsTable).values({
      ...testHotel,
      cost_price: testHotel.cost_price.toString(),
      markup_percentage: testHotel.markup_percentage.toString(),
      selling_price: (testHotel.cost_price * (1 + testHotel.markup_percentage / 100)).toString()
    }).returning();

    const booking1 = await db.insert(bookingsTable).values({
      invoice_number: 'INV-001',
      customer_id: customer[0].id,
      hotel_id: hotel[0].id,
      check_in_date: new Date(testBooking.check_in_date),
      check_out_date: new Date(testBooking.check_out_date),
      room_quantity: testBooking.room_quantity,
      hotel_subtotal: '240.00',
      services_total: '0.00',
      total_amount: '240.00'
    }).returning();

    const booking2 = await db.insert(bookingsTable).values({
      invoice_number: 'INV-002',
      customer_id: customer[0].id,
      hotel_id: hotel[0].id,
      check_in_date: new Date(testBooking.check_in_date),
      check_out_date: new Date(testBooking.check_out_date),
      room_quantity: 1,
      hotel_subtotal: '120.00',
      services_total: '0.00',
      total_amount: '120.00'
    }).returning();

    // Create payments with exact amounts to avoid floating point issues
    await db.insert(paymentsTable).values({
      booking_id: booking1[0].id,
      amount: testPayment1.amount.toString(),
      currency: testPayment1.currency,
      amount_in_sar: '375.00', // 100.00 * 3.75
      payment_method: testPayment1.payment_method
    });

    await db.insert(paymentsTable).values({
      booking_id: booking1[0].id,
      amount: testPayment2.amount.toString(),
      currency: testPayment2.currency,
      amount_in_sar: testPayment2.amount.toString(),
      payment_method: testPayment2.payment_method
    });

    await db.insert(paymentsTable).values({
      booking_id: booking2[0].id,
      amount: testPayment3.amount.toString(),
      currency: testPayment3.currency,
      amount_in_sar: '562.50', // 150.00 * 3.75
      payment_method: testPayment3.payment_method
    });

    const result = await getPaymentsByBooking(booking1[0].id);

    expect(result).toHaveLength(2);
    
    // Check first payment
    expect(result[0].booking_id).toEqual(booking1[0].id);
    expect(result[0].amount).toEqual(100.00);
    expect(typeof result[0].amount).toBe('number');
    expect(result[0].currency).toEqual('USD');
    expect(result[0].amount_in_sar).toEqual(375.00);
    expect(typeof result[0].amount_in_sar).toBe('number');
    expect(result[0].payment_method).toEqual('Cash');
    expect(result[0].payment_date).toBeInstanceOf(Date);
    expect(result[0].created_at).toBeInstanceOf(Date);

    // Check second payment
    expect(result[1].booking_id).toEqual(booking1[0].id);
    expect(result[1].amount).toEqual(200.00);
    expect(result[1].currency).toEqual('SAR');
    expect(result[1].amount_in_sar).toEqual(200.00);
    expect(result[1].payment_method).toEqual('Bank Transfer');
  });

  it('should return empty array for booking with no payments', async () => {
    // Create prerequisite data without payments
    const customer = await db.insert(customersTable).values(testCustomer).returning();
    
    const hotel = await db.insert(hotelsTable).values({
      ...testHotel,
      cost_price: testHotel.cost_price.toString(),
      markup_percentage: testHotel.markup_percentage.toString(),
      selling_price: (testHotel.cost_price * (1 + testHotel.markup_percentage / 100)).toString()
    }).returning();

    const booking = await db.insert(bookingsTable).values({
      invoice_number: 'INV-001',
      customer_id: customer[0].id,
      hotel_id: hotel[0].id,
      check_in_date: new Date(testBooking.check_in_date),
      check_out_date: new Date(testBooking.check_out_date),
      room_quantity: testBooking.room_quantity,
      hotel_subtotal: '240.00',
      services_total: '0.00',
      total_amount: '240.00'
    }).returning();

    const result = await getPaymentsByBooking(booking[0].id);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return empty array for non-existent booking', async () => {
    const result = await getPaymentsByBooking(999);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should verify payments are saved correctly in database', async () => {
    // Create prerequisite data
    const customer = await db.insert(customersTable).values(testCustomer).returning();
    
    const hotel = await db.insert(hotelsTable).values({
      ...testHotel,
      cost_price: testHotel.cost_price.toString(),
      markup_percentage: testHotel.markup_percentage.toString(),
      selling_price: (testHotel.cost_price * (1 + testHotel.markup_percentage / 100)).toString()
    }).returning();

    const booking = await db.insert(bookingsTable).values({
      invoice_number: 'INV-001',
      customer_id: customer[0].id,
      hotel_id: hotel[0].id,
      check_in_date: new Date(testBooking.check_in_date),
      check_out_date: new Date(testBooking.check_out_date),
      room_quantity: testBooking.room_quantity,
      hotel_subtotal: '240.00',
      services_total: '0.00',
      total_amount: '240.00'
    }).returning();

    // Create payment with exact amount
    await db.insert(paymentsTable).values({
      booking_id: booking[0].id,
      amount: testPayment1.amount.toString(),
      currency: testPayment1.currency,
      amount_in_sar: '375.00',
      payment_method: testPayment1.payment_method
    });

    // Verify payment was created correctly
    const dbPayments = await db.select()
      .from(paymentsTable)
      .where(eq(paymentsTable.booking_id, booking[0].id))
      .execute();

    expect(dbPayments).toHaveLength(1);
    expect(dbPayments[0].booking_id).toEqual(booking[0].id);
    expect(parseFloat(dbPayments[0].amount)).toEqual(100.00);
    expect(dbPayments[0].currency).toEqual('USD');
    expect(parseFloat(dbPayments[0].amount_in_sar)).toEqual(375.00);

    // Test handler returns the same data with proper conversion
    const result = await getPaymentsByBooking(booking[0].id);
    expect(result).toHaveLength(1);
    expect(result[0].amount).toEqual(100.00);
    expect(result[0].amount_in_sar).toEqual(375.00);
  });
});
