
import { db } from '../db';
import { servicesTable } from '../db/schema';
import { type Service } from '../schema';
import { eq } from 'drizzle-orm';

export const getService = async (id: number): Promise<Service | null> => {
  try {
    const results = await db.select()
      .from(servicesTable)
      .where(eq(servicesTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const service = results[0];
    return {
      ...service,
      cost_price: parseFloat(service.cost_price),
      markup_percentage: parseFloat(service.markup_percentage),
      selling_price: parseFloat(service.selling_price)
    };
  } catch (error) {
    console.error('Service retrieval failed:', error);
    throw error;
  }
};
