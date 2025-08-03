
import { db } from '../db';
import { bookingsTable, hotelsTable, servicesTable, bookingServicesTable, customersTable } from '../db/schema';
import { type CreateBookingInput, type Booking } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function updateBooking(id: number, input: Partial<CreateBookingInput>): Promise<Booking> {
  try {
    // First, get the existing booking to validate it exists
    const existingBookings = await db.select()
      .from(bookingsTable)
      .where(eq(bookingsTable.id, id))
      .execute();

    if (existingBookings.length === 0) {
      throw new Error('Booking not found');
    }

    const existingBooking = existingBookings[0];

    // Validate foreign keys if they are being updated
    if (input.customer_id !== undefined) {
      const customers = await db.select()
        .from(customersTable)
        .where(eq(customersTable.id, input.customer_id))
        .execute();
      
      if (customers.length === 0) {
        throw new Error('Customer not found');
      }
    }

    if (input.hotel_id !== undefined) {
      const hotels = await db.select()
        .from(hotelsTable)
        .where(eq(hotelsTable.id, input.hotel_id))
        .execute();
      
      if (hotels.length === 0) {
        throw new Error('Hotel not found');
      }
    }

    // Get hotel information for calculations (use existing or new hotel_id)
    const hotelId = input.hotel_id ?? existingBooking.hotel_id;
    const hotels = await db.select()
      .from(hotelsTable)
      .where(eq(hotelsTable.id, hotelId))
      .execute();
    
    const hotel = hotels[0];

    // Calculate hotel subtotal
    const roomQuantity = input.room_quantity ?? existingBooking.room_quantity;
    const checkInDate = input.check_in_date ? new Date(input.check_in_date) : existingBooking.check_in_date;
    const checkOutDate = input.check_out_date ? new Date(input.check_out_date) : existingBooking.check_out_date;
    
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
    const hotelSubtotal = parseFloat(hotel.selling_price) * roomQuantity * nights;

    // Handle services updates
    let servicesTotal = parseFloat(existingBooking.services_total);
    
    if (input.services) {
      // Remove existing booking services
      await db.delete(bookingServicesTable)
        .where(eq(bookingServicesTable.booking_id, id))
        .execute();

      // Add new services and calculate total
      servicesTotal = 0;
      
      for (const serviceInput of input.services) {
        // Validate service exists
        const services = await db.select()
          .from(servicesTable)
          .where(eq(servicesTable.id, serviceInput.service_id))
          .execute();
        
        if (services.length === 0) {
          throw new Error(`Service with id ${serviceInput.service_id} not found`);
        }

        const service = services[0];
        const unitPrice = parseFloat(service.selling_price);
        const totalPrice = unitPrice * serviceInput.quantity;

        await db.insert(bookingServicesTable)
          .values({
            booking_id: id,
            service_id: serviceInput.service_id,
            quantity: serviceInput.quantity,
            unit_price: unitPrice.toString(),
            total_price: totalPrice.toString()
          })
          .execute();

        servicesTotal += totalPrice;
      }
    }

    const totalAmount = hotelSubtotal + servicesTotal;

    // Update the booking
    const updateData: any = {
      hotel_subtotal: hotelSubtotal.toString(),
      services_total: servicesTotal.toString(),
      total_amount: totalAmount.toString(),
      updated_at: new Date()
    };

    if (input.customer_id !== undefined) {
      updateData.customer_id = input.customer_id;
    }
    if (input.hotel_id !== undefined) {
      updateData.hotel_id = input.hotel_id;
    }
    if (input.check_in_date !== undefined) {
      updateData.check_in_date = new Date(input.check_in_date);
    }
    if (input.check_out_date !== undefined) {
      updateData.check_out_date = new Date(input.check_out_date);
    }
    if (input.room_quantity !== undefined) {
      updateData.room_quantity = input.room_quantity;
    }

    const result = await db.update(bookingsTable)
      .set(updateData)
      .where(eq(bookingsTable.id, id))
      .returning()
      .execute();

    const updatedBooking = result[0];
    return {
      ...updatedBooking,
      hotel_subtotal: parseFloat(updatedBooking.hotel_subtotal),
      services_total: parseFloat(updatedBooking.services_total),
      total_amount: parseFloat(updatedBooking.total_amount)
    };
  } catch (error) {
    console.error('Booking update failed:', error);
    throw error;
  }
}
