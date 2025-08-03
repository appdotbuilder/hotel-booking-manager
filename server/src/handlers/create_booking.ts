
import { db } from '../db';
import { bookingsTable, bookingServicesTable, hotelsTable, servicesTable, customersTable } from '../db/schema';
import { type CreateBookingInput, type Booking } from '../schema';
import { eq } from 'drizzle-orm';

export const createBooking = async (input: CreateBookingInput): Promise<Booking> => {
  try {
    // Verify customer exists
    const customer = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, input.customer_id))
      .execute();
    
    if (customer.length === 0) {
      throw new Error('Customer not found');
    }

    // Verify hotel exists and get pricing
    const hotel = await db.select()
      .from(hotelsTable)
      .where(eq(hotelsTable.id, input.hotel_id))
      .execute();
    
    if (hotel.length === 0) {
      throw new Error('Hotel not found');
    }

    const hotelData = hotel[0];
    const hotelSellingPrice = parseFloat(hotelData.selling_price);

    // Calculate number of nights
    const checkInDate = new Date(input.check_in_date);
    const checkOutDate = new Date(input.check_out_date);
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (nights <= 0) {
      throw new Error('Check-out date must be after check-in date');
    }

    // Calculate hotel subtotal: selling_price * room_quantity * nights
    const hotel_subtotal = hotelSellingPrice * input.room_quantity * nights;

    // Calculate services total
    let services_total = 0;
    const serviceItems = [];

    if (input.services && input.services.length > 0) {
      // Get all service pricing in one query
      const serviceIds = input.services.map(s => s.service_id);
      const servicesData = await db.select()
        .from(servicesTable)
        .where(eq(servicesTable.id, serviceIds[0])) // Start with first service
        .execute();

      // Get all services (need to handle multiple IDs properly)
      const allServices = [];
      for (const serviceId of serviceIds) {
        const serviceResult = await db.select()
          .from(servicesTable)
          .where(eq(servicesTable.id, serviceId))
          .execute();
        
        if (serviceResult.length === 0) {
          throw new Error(`Service with ID ${serviceId} not found`);
        }
        
        allServices.push(serviceResult[0]);
      }

      // Calculate service totals and prepare items for insertion
      for (const serviceInput of input.services) {
        const service = allServices.find(s => s.id === serviceInput.service_id);
        if (!service) {
          throw new Error(`Service with ID ${serviceInput.service_id} not found`);
        }

        const unit_price = parseFloat(service.selling_price);
        const total_price = unit_price * serviceInput.quantity;
        services_total += total_price;

        serviceItems.push({
          service_id: serviceInput.service_id,
          quantity: serviceInput.quantity,
          unit_price,
          total_price
        });
      }
    }

    const total_amount = hotel_subtotal + services_total;

    // Generate unique invoice number
    const invoice_number = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    // Create booking record
    const bookingResult = await db.insert(bookingsTable)
      .values({
        invoice_number,
        customer_id: input.customer_id,
        hotel_id: input.hotel_id,
        check_in_date: checkInDate,
        check_out_date: checkOutDate,
        room_quantity: input.room_quantity,
        hotel_subtotal: hotel_subtotal.toString(),
        services_total: services_total.toString(),
        total_amount: total_amount.toString()
      })
      .returning()
      .execute();

    const booking = bookingResult[0];

    // Create booking services records
    if (serviceItems.length > 0) {
      await db.insert(bookingServicesTable)
        .values(serviceItems.map(item => ({
          booking_id: booking.id,
          service_id: item.service_id,
          quantity: item.quantity,
          unit_price: item.unit_price.toString(),
          total_price: item.total_price.toString()
        })))
        .execute();
    }

    // Return booking with proper numeric conversions
    return {
      ...booking,
      hotel_subtotal: parseFloat(booking.hotel_subtotal),
      services_total: parseFloat(booking.services_total),
      total_amount: parseFloat(booking.total_amount)
    };
  } catch (error) {
    console.error('Booking creation failed:', error);
    throw error;
  }
};
