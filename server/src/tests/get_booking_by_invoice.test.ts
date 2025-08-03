
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, hotelsTable, bookingsTable } from '../db/schema';
import { type CreateBookingInput } from '../schema';
import { getBookingByInvoice } from '../handlers/get_booking_by_invoice';

describe('getBookingByInvoice', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return booking when invoice exists', async () => {
    // Create prerequisite data
    const customer = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        address: 'Test Address',
        phone: '123456789',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    const hotel = await db.insert(hotelsTable)
      .values({
        name: 'Test Hotel',
        location: 'Test Location',
        room_type: 'Double',
        meal_package: 'Full Board',
        cost_price: '100.00',
        markup_percentage: '20.00',
        selling_price: '120.00'
      })
      .returning()
      .execute();

    // Create booking
    const booking = await db.insert(bookingsTable)
      .values({
        invoice_number: 'INV-001',
        customer_id: customer[0].id,
        hotel_id: hotel[0].id,
        check_in_date: new Date('2024-01-01'),
        check_out_date: new Date('2024-01-03'),
        room_quantity: 2,
        hotel_subtotal: '240.00',
        services_total: '50.00',
        total_amount: '290.00'
      })
      .returning()
      .execute();

    const result = await getBookingByInvoice('INV-001');

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(booking[0].id);
    expect(result!.invoice_number).toEqual('INV-001');
    expect(result!.customer_id).toEqual(customer[0].id);
    expect(result!.hotel_id).toEqual(hotel[0].id);
    expect(result!.room_quantity).toEqual(2);
    expect(result!.hotel_subtotal).toEqual(240.00);
    expect(result!.services_total).toEqual(50.00);
    expect(result!.total_amount).toEqual(290.00);
    expect(typeof result!.hotel_subtotal).toBe('number');
    expect(typeof result!.services_total).toBe('number');
    expect(typeof result!.total_amount).toBe('number');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when invoice does not exist', async () => {
    const result = await getBookingByInvoice('NON-EXISTENT');

    expect(result).toBeNull();
  });

  it('should handle empty invoice number', async () => {
    const result = await getBookingByInvoice('');

    expect(result).toBeNull();
  });

  it('should handle case sensitive invoice numbers', async () => {
    // Create prerequisite data
    const customer = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        address: 'Test Address',
        phone: '123456789',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    const hotel = await db.insert(hotelsTable)
      .values({
        name: 'Test Hotel',
        location: 'Test Location',
        room_type: 'Double',
        meal_package: 'Full Board',
        cost_price: '100.00',
        markup_percentage: '20.00',
        selling_price: '120.00'
      })
      .returning()
      .execute();

    // Create booking with lowercase invoice
    await db.insert(bookingsTable)
      .values({
        invoice_number: 'inv-002',
        customer_id: customer[0].id,
        hotel_id: hotel[0].id,
        check_in_date: new Date('2024-01-01'),
        check_out_date: new Date('2024-01-03'),
        room_quantity: 1,
        hotel_subtotal: '120.00',
        services_total: '0.00',
        total_amount: '120.00'
      })
      .returning()
      .execute();

    // Search with uppercase should not find it (case sensitive)
    const result = await getBookingByInvoice('INV-002');
    expect(result).toBeNull();

    // Search with exact case should find it
    const exactResult = await getBookingByInvoice('inv-002');
    expect(exactResult).not.toBeNull();
    expect(exactResult!.invoice_number).toEqual('inv-002');
  });
});
