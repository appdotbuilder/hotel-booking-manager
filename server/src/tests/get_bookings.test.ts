
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, hotelsTable, bookingsTable } from '../db/schema';
import { type CreateCustomerInput, type CreateHotelInput, type CreateBookingInput } from '../schema';
import { getBookings } from '../handlers/get_bookings';

// Test data
const testCustomer: CreateCustomerInput = {
  name: 'John Doe',
  address: '123 Main St',
  phone: '+1234567890',
  email: 'john@example.com'
};

const testHotel: CreateHotelInput = {
  name: 'Grand Hotel',
  location: 'Downtown',
  room_type: 'Double',
  meal_package: 'Full Board',
  cost_price: 100.00,
  markup_percentage: 20.00
};

describe('getBookings', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no bookings exist', async () => {
    const result = await getBookings();
    expect(result).toEqual([]);
  });

  it('should return all bookings with correct data structure', async () => {
    // Create prerequisite data
    const customerResult = await db.insert(customersTable)
      .values(testCustomer)
      .returning()
      .execute();

    const customer = customerResult[0];

    // Calculate selling price for hotel
    const sellingPrice = testHotel.cost_price + (testHotel.markup_percentage / 100 * testHotel.cost_price);
    
    const hotelResult = await db.insert(hotelsTable)
      .values({
        ...testHotel,
        cost_price: testHotel.cost_price.toString(),
        markup_percentage: testHotel.markup_percentage.toString(),
        selling_price: sellingPrice.toString()
      })
      .returning()
      .execute();

    const hotel = hotelResult[0];

    // Create booking
    const bookingData = {
      invoice_number: 'INV001',
      customer_id: customer.id,
      hotel_id: hotel.id,
      check_in_date: new Date('2024-01-15'),
      check_out_date: new Date('2024-01-20'),
      room_quantity: 2,
      hotel_subtotal: '500.00',
      services_total: '100.00',
      total_amount: '600.00'
    };

    await db.insert(bookingsTable)
      .values(bookingData)
      .execute();

    // Test the handler
    const result = await getBookings();

    expect(result).toHaveLength(1);
    
    const booking = result[0];
    expect(booking.invoice_number).toEqual('INV001');
    expect(booking.customer_id).toEqual(customer.id);
    expect(booking.hotel_id).toEqual(hotel.id);
    expect(booking.check_in_date).toEqual(new Date('2024-01-15'));
    expect(booking.check_out_date).toEqual(new Date('2024-01-20'));
    expect(booking.room_quantity).toEqual(2);
    expect(booking.hotel_subtotal).toEqual(500.00);
    expect(booking.services_total).toEqual(100.00);
    expect(booking.total_amount).toEqual(600.00);
    expect(booking.id).toBeDefined();
    expect(booking.created_at).toBeInstanceOf(Date);
    expect(booking.updated_at).toBeInstanceOf(Date);

    // Verify numeric types
    expect(typeof booking.hotel_subtotal).toBe('number');
    expect(typeof booking.services_total).toBe('number');
    expect(typeof booking.total_amount).toBe('number');
  });

  it('should return multiple bookings correctly', async () => {
    // Create prerequisite data
    const customerResult = await db.insert(customersTable)
      .values(testCustomer)
      .returning()
      .execute();

    const customer = customerResult[0];

    const sellingPrice = testHotel.cost_price + (testHotel.markup_percentage / 100 * testHotel.cost_price);
    
    const hotelResult = await db.insert(hotelsTable)
      .values({
        ...testHotel,
        cost_price: testHotel.cost_price.toString(),
        markup_percentage: testHotel.markup_percentage.toString(),
        selling_price: sellingPrice.toString()
      })
      .returning()
      .execute();

    const hotel = hotelResult[0];

    // Create multiple bookings
    const bookings = [
      {
        invoice_number: 'INV001',
        customer_id: customer.id,
        hotel_id: hotel.id,
        check_in_date: new Date('2024-01-15'),
        check_out_date: new Date('2024-01-20'),
        room_quantity: 1,
        hotel_subtotal: '300.00',
        services_total: '50.00',
        total_amount: '350.00'
      },
      {
        invoice_number: 'INV002',
        customer_id: customer.id,
        hotel_id: hotel.id,
        check_in_date: new Date('2024-02-10'),
        check_out_date: new Date('2024-02-15'),
        room_quantity: 2,
        hotel_subtotal: '600.00',
        services_total: '100.00',
        total_amount: '700.00'
      }
    ];

    for (const booking of bookings) {
      await db.insert(bookingsTable)
        .values(booking)
        .execute();
    }

    // Test the handler
    const result = await getBookings();

    expect(result).toHaveLength(2);
    
    // Verify first booking
    const firstBooking = result.find(b => b.invoice_number === 'INV001');
    expect(firstBooking).toBeDefined();
    expect(firstBooking!.total_amount).toEqual(350.00);
    expect(typeof firstBooking!.total_amount).toBe('number');
    
    // Verify second booking
    const secondBooking = result.find(b => b.invoice_number === 'INV002');
    expect(secondBooking).toBeDefined();
    expect(secondBooking!.total_amount).toEqual(700.00);
    expect(typeof secondBooking!.total_amount).toBe('number');
  });
});
