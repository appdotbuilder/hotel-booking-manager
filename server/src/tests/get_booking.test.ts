
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, hotelsTable, bookingsTable } from '../db/schema';
import { getBooking } from '../handlers/get_booking';

describe('getBooking', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return a booking by ID', async () => {
    // Create prerequisite customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'John Doe',
        address: '123 Main St',
        phone: '+1234567890',
        email: 'john@example.com'
      })
      .returning()
      .execute();

    // Create prerequisite hotel
    const hotelResult = await db.insert(hotelsTable)
      .values({
        name: 'Grand Hotel',
        location: 'Downtown',
        room_type: 'Double',
        meal_package: 'Full Board',
        cost_price: '200.00',
        markup_percentage: '20.00',
        selling_price: '240.00'
      })
      .returning()
      .execute();

    // Create booking
    const bookingResult = await db.insert(bookingsTable)
      .values({
        invoice_number: 'INV-001',
        customer_id: customerResult[0].id,
        hotel_id: hotelResult[0].id,
        check_in_date: new Date('2024-01-15'),
        check_out_date: new Date('2024-01-18'),
        room_quantity: 2,
        hotel_subtotal: '480.00',
        services_total: '120.00',
        total_amount: '600.00'
      })
      .returning()
      .execute();

    const result = await getBooking(bookingResult[0].id);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(bookingResult[0].id);
    expect(result!.invoice_number).toBe('INV-001');
    expect(result!.customer_id).toBe(customerResult[0].id);
    expect(result!.hotel_id).toBe(hotelResult[0].id);
    expect(result!.room_quantity).toBe(2);
    expect(result!.hotel_subtotal).toBe(480.00);
    expect(result!.services_total).toBe(120.00);
    expect(result!.total_amount).toBe(600.00);
    expect(typeof result!.hotel_subtotal).toBe('number');
    expect(typeof result!.services_total).toBe('number');
    expect(typeof result!.total_amount).toBe('number');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent booking', async () => {
    const result = await getBooking(999);
    
    expect(result).toBeNull();
  });

  it('should handle date fields correctly', async () => {
    // Create prerequisite customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Jane Smith',
        address: '456 Oak Ave',
        phone: '+1987654321',
        email: 'jane@example.com'
      })
      .returning()
      .execute();

    // Create prerequisite hotel
    const hotelResult = await db.insert(hotelsTable)
      .values({
        name: 'Beach Resort',
        location: 'Coastal',
        room_type: 'Triple',
        meal_package: 'Half Board',
        cost_price: '150.00',
        markup_percentage: '30.00',
        selling_price: '195.00'
      })
      .returning()
      .execute();

    const checkInDate = new Date('2024-02-01T10:00:00Z');
    const checkOutDate = new Date('2024-02-05T12:00:00Z');

    // Create booking with specific dates
    const bookingResult = await db.insert(bookingsTable)
      .values({
        invoice_number: 'INV-002',
        customer_id: customerResult[0].id,
        hotel_id: hotelResult[0].id,
        check_in_date: checkInDate,
        check_out_date: checkOutDate,
        room_quantity: 1,
        hotel_subtotal: '195.00',
        services_total: '50.00',
        total_amount: '245.00'
      })
      .returning()
      .execute();

    const result = await getBooking(bookingResult[0].id);

    expect(result).not.toBeNull();
    expect(result!.check_in_date).toBeInstanceOf(Date);
    expect(result!.check_out_date).toBeInstanceOf(Date);
    expect(result!.check_in_date.getTime()).toBe(checkInDate.getTime());
    expect(result!.check_out_date.getTime()).toBe(checkOutDate.getTime());
  });
});
