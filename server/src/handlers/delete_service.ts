
import { db } from '../db';
import { servicesTable, bookingServicesTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function deleteService(id: number): Promise<boolean> {
  try {
    // Check if service exists
    const existingService = await db.select()
      .from(servicesTable)
      .where(eq(servicesTable.id, id))
      .execute();

    if (existingService.length === 0) {
      throw new Error('Service not found');
    }

    // Check if service is used in any bookings
    const bookingServices = await db.select()
      .from(bookingServicesTable)
      .where(eq(bookingServicesTable.service_id, id))
      .execute();

    if (bookingServices.length > 0) {
      throw new Error('Cannot delete service: service is used in existing bookings');
    }

    // Delete the service
    await db.delete(servicesTable)
      .where(eq(servicesTable.id, id))
      .execute();

    return true;
  } catch (error) {
    console.error('Service deletion failed:', error);
    throw error;
  }
}
