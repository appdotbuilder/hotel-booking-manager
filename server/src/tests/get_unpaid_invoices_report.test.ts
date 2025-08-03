
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, hotelsTable, bookingsTable, paymentsTable } from '../db/schema';
import { type CreateCustomerInput, type CreateHotelInput } from '../schema';
import { getUnpaidInvoicesReport } from '../handlers/get_unpaid_invoices_report';

// Test data
const testCustomer: CreateCustomerInput = {
  name: 'John Doe',
  address: '123 Main St',
  phone: '123-456-7890',
  email: 'john@example.com'
};

const testHotel: CreateHotelInput = {
  name: 'Test Hotel',
  location: 'Test City',
  room_type: 'Double',
  meal_package: 'Full Board',
  cost_price: 100,
  markup_percentage: 20
};

describe('getUnpaidInvoicesReport', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no bookings exist', async () => {
    const result = await getUnpaidInvoicesReport();
    expect(result).toEqual([]);
  });

  it('should return unpaid invoices with correct outstanding balance', async () => {
    // Create customer
    const [customer] = await db.insert(customersTable)
      .values(testCustomer)
      .returning()
      .execute();

    // Create hotel
    const [hotel] = await db.insert(hotelsTable)
      .values({
        ...testHotel,
        cost_price: testHotel.cost_price.toString(),
        markup_percentage: testHotel.markup_percentage.toString(),
        selling_price: '120.00' // cost_price + markup
      })
      .returning()
      .execute();

    // Create booking
    const [booking] = await db.insert(bookingsTable)
      .values({
        invoice_number: 'INV-001',
        customer_id: customer.id,
        hotel_id: hotel.id,
        check_in_date: new Date('2024-01-01'),
        check_out_date: new Date('2024-01-05'),
        room_quantity: 2,
        hotel_subtotal: '240.00',
        services_total: '0.00',
        total_amount: '240.00'
      })
      .returning()
      .execute();

    // Create partial payment
    await db.insert(paymentsTable)
      .values({
        booking_id: booking.id,
        amount: '100.00',
        currency: 'SAR',
        amount_in_sar: '100.00',
        payment_method: 'Cash'
      })
      .execute();

    const result = await getUnpaidInvoicesReport();

    expect(result).toHaveLength(1);
    expect(result[0].invoice_number).toEqual('INV-001');
    expect(result[0].customer_name).toEqual('John Doe');
    expect(result[0].total_amount).toEqual(240);
    expect(result[0].paid_amount).toEqual(100);
    expect(result[0].outstanding_balance).toEqual(140);
    expect(result[0].booking_date).toBeInstanceOf(Date);
  });

  it('should exclude fully paid invoices', async () => {
    // Create customer
    const [customer] = await db.insert(customersTable)
      .values(testCustomer)
      .returning()
      .execute();

    // Create hotel
    const [hotel] = await db.insert(hotelsTable)
      .values({
        ...testHotel,
        cost_price: testHotel.cost_price.toString(),
        markup_percentage: testHotel.markup_percentage.toString(),
        selling_price: '120.00'
      })
      .returning()
      .execute();

    // Create booking
    const [booking] = await db.insert(bookingsTable)
      .values({
        invoice_number: 'INV-002',
        customer_id: customer.id,
        hotel_id: hotel.id,
        check_in_date: new Date('2024-01-01'),
        check_out_date: new Date('2024-01-05'),
        room_quantity: 1,
        hotel_subtotal: '120.00',
        services_total: '0.00',
        total_amount: '120.00'
      })
      .returning()
      .execute();

    // Create full payment
    await db.insert(paymentsTable)
      .values({
        booking_id: booking.id,
        amount: '120.00',
        currency: 'SAR',
        amount_in_sar: '120.00',
        payment_method: 'Cash'
      })
      .execute();

    const result = await getUnpaidInvoicesReport();

    expect(result).toHaveLength(0);
  });

  it('should handle multiple unpaid invoices correctly', async () => {
    // Create customer
    const [customer] = await db.insert(customersTable)
      .values(testCustomer)
      .returning()
      .execute();

    // Create hotel
    const [hotel] = await db.insert(hotelsTable)
      .values({
        ...testHotel,
        cost_price: testHotel.cost_price.toString(),
        markup_percentage: testHotel.markup_percentage.toString(),
        selling_price: '120.00'
      })
      .returning()
      .execute();

    // Create first booking (completely unpaid)
    const [booking1] = await db.insert(bookingsTable)
      .values({
        invoice_number: 'INV-003',
        customer_id: customer.id,
        hotel_id: hotel.id,
        check_in_date: new Date('2024-01-01'),
        check_out_date: new Date('2024-01-05'),
        room_quantity: 1,
        hotel_subtotal: '120.00',
        services_total: '0.00',
        total_amount: '120.00'
      })
      .returning()
      .execute();

    // Create second booking (partially paid)
    const [booking2] = await db.insert(bookingsTable)
      .values({
        invoice_number: 'INV-004',
        customer_id: customer.id,
        hotel_id: hotel.id,
        check_in_date: new Date('2024-02-01'),
        check_out_date: new Date('2024-02-05'),
        room_quantity: 2,
        hotel_subtotal: '240.00',
        services_total: '0.00',
        total_amount: '240.00'
      })
      .returning()
      .execute();

    // Add partial payment to second booking
    await db.insert(paymentsTable)
      .values({
        booking_id: booking2.id,
        amount: '150.00',
        currency: 'SAR',
        amount_in_sar: '150.00',
        payment_method: 'Bank Transfer'
      })
      .execute();

    const result = await getUnpaidInvoicesReport();

    expect(result).toHaveLength(2);
    
    // Check first booking (completely unpaid)
    const unpaidBooking = result.find(r => r.invoice_number === 'INV-003');
    expect(unpaidBooking).toBeDefined();
    expect(unpaidBooking!.outstanding_balance).toEqual(120);
    expect(unpaidBooking!.paid_amount).toEqual(0);

    // Check second booking (partially paid)
    const partiallyPaidBooking = result.find(r => r.invoice_number === 'INV-004');
    expect(partiallyPaidBooking).toBeDefined();
    expect(partiallyPaidBooking!.outstanding_balance).toEqual(90);
    expect(partiallyPaidBooking!.paid_amount).toEqual(150);
  });

  it('should handle bookings with no payments', async () => {
    // Create customer
    const [customer] = await db.insert(customersTable)
      .values(testCustomer)
      .returning()
      .execute();

    // Create hotel
    const [hotel] = await db.insert(hotelsTable)
      .values({
        ...testHotel,
        cost_price: testHotel.cost_price.toString(),
        markup_percentage: testHotel.markup_percentage.toString(),
        selling_price: '120.00'
      })
      .returning()
      .execute();

    // Create booking with no payments
    await db.insert(bookingsTable)
      .values({
        invoice_number: 'INV-005',
        customer_id: customer.id,
        hotel_id: hotel.id,
        check_in_date: new Date('2024-01-01'),
        check_out_date: new Date('2024-01-05'),
        room_quantity: 1,
        hotel_subtotal: '120.00',
        services_total: '0.00',
        total_amount: '120.00'
      })
      .execute();

    const result = await getUnpaidInvoicesReport();

    expect(result).toHaveLength(1);
    expect(result[0].invoice_number).toEqual('INV-005');
    expect(result[0].paid_amount).toEqual(0);
    expect(result[0].outstanding_balance).toEqual(120);
  });
});
