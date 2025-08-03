
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { servicesTable, bookingServicesTable, bookingsTable, customersTable, hotelsTable } from '../db/schema';
import { type CreateServiceInput, type CreateCustomerInput, type CreateHotelInput, type CreateBookingInput } from '../schema';
import { deleteService } from '../handlers/delete_service';
import { eq } from 'drizzle-orm';

const testService: CreateServiceInput = {
  name: 'Test Service',
  cost_price: 100.00,
  markup_percentage: 20.00
};

const testCustomer: CreateCustomerInput = {
  name: 'Test Customer',
  address: '123 Test St',
  phone: '+1234567890',
  email: 'test@example.com'
};

const testHotel: CreateHotelInput = {
  name: 'Test Hotel',
  location: 'Test City',
  room_type: 'Double',
  meal_package: 'Full Board',
  cost_price: 200.00,
  markup_percentage: 25.00
};

describe('deleteService', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing service', async () => {
    // Create a service
    const serviceResult = await db.insert(servicesTable)
      .values({
        name: testService.name,
        cost_price: testService.cost_price.toString(),
        markup_percentage: testService.markup_percentage.toString(),
        selling_price: '120.00' // cost_price + (markup_percentage * cost_price)
      })
      .returning()
      .execute();

    const serviceId = serviceResult[0].id;

    // Delete the service
    const result = await deleteService(serviceId);

    expect(result).toBe(true);

    // Verify service is deleted
    const services = await db.select()
      .from(servicesTable)
      .where(eq(servicesTable.id, serviceId))
      .execute();

    expect(services).toHaveLength(0);
  });

  it('should throw error when service does not exist', async () => {
    const nonExistentId = 999;

    await expect(deleteService(nonExistentId)).rejects.toThrow(/service not found/i);
  });

  it('should prevent deletion when service is used in bookings', async () => {
    // Create customer
    const customerResult = await db.insert(customersTable)
      .values(testCustomer)
      .returning()
      .execute();
    const customerId = customerResult[0].id;

    // Create hotel
    const hotelResult = await db.insert(hotelsTable)
      .values({
        name: testHotel.name,
        location: testHotel.location,
        room_type: testHotel.room_type,
        meal_package: testHotel.meal_package,
        cost_price: testHotel.cost_price.toString(),
        markup_percentage: testHotel.markup_percentage.toString(),
        selling_price: '250.00' // cost_price + (markup_percentage * cost_price)
      })
      .returning()
      .execute();
    const hotelId = hotelResult[0].id;

    // Create service
    const serviceResult = await db.insert(servicesTable)
      .values({
        name: testService.name,
        cost_price: testService.cost_price.toString(),
        markup_percentage: testService.markup_percentage.toString(),
        selling_price: '120.00'
      })
      .returning()
      .execute();
    const serviceId = serviceResult[0].id;

    // Create booking
    const bookingResult = await db.insert(bookingsTable)
      .values({
        invoice_number: 'INV-001',
        customer_id: customerId,
        hotel_id: hotelId,
        check_in_date: new Date('2024-01-01'),
        check_out_date: new Date('2024-01-02'),
        room_quantity: 1,
        hotel_subtotal: '250.00',
        services_total: '120.00',
        total_amount: '370.00'
      })
      .returning()
      .execute();
    const bookingId = bookingResult[0].id;

    // Create booking service (linking service to booking)
    await db.insert(bookingServicesTable)
      .values({
        booking_id: bookingId,
        service_id: serviceId,
        quantity: 1,
        unit_price: '120.00',
        total_price: '120.00'
      })
      .execute();

    // Attempt to delete service should fail
    await expect(deleteService(serviceId)).rejects.toThrow(/cannot delete service.*used in existing bookings/i);

    // Verify service still exists
    const services = await db.select()
      .from(servicesTable)
      .where(eq(servicesTable.id, serviceId))
      .execute();

    expect(services).toHaveLength(1);
  });

  it('should allow deletion when service exists but has no booking relations', async () => {
    // Create service
    const serviceResult = await db.insert(servicesTable)
      .values({
        name: testService.name,
        cost_price: testService.cost_price.toString(),
        markup_percentage: testService.markup_percentage.toString(),
        selling_price: '120.00'
      })
      .returning()
      .execute();
    const serviceId = serviceResult[0].id;

    // Delete should succeed
    const result = await deleteService(serviceId);

    expect(result).toBe(true);

    // Verify service is deleted
    const services = await db.select()
      .from(servicesTable)
      .where(eq(servicesTable.id, serviceId))
      .execute();

    expect(services).toHaveLength(0);
  });
});
