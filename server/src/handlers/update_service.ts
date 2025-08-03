
import { db } from '../db';
import { servicesTable } from '../db/schema';
import { type UpdateServiceInput, type Service } from '../schema';
import { eq } from 'drizzle-orm';

export const updateService = async (input: UpdateServiceInput): Promise<Service> => {
  try {
    // First, get the current service data
    const currentService = await db.select()
      .from(servicesTable)
      .where(eq(servicesTable.id, input.id))
      .execute();

    if (currentService.length === 0) {
      throw new Error(`Service with id ${input.id} not found`);
    }

    const existing = currentService[0];

    // Determine final values (use input values if provided, otherwise keep existing)
    const finalCostPrice = input.cost_price !== undefined ? input.cost_price : parseFloat(existing.cost_price);
    const finalMarkupPercentage = input.markup_percentage !== undefined ? input.markup_percentage : parseFloat(existing.markup_percentage);
    
    // Calculate selling price
    const finalSellingPrice = finalCostPrice + (finalMarkupPercentage / 100 * finalCostPrice);

    // Build update object with only the fields that should be updated
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.name !== undefined) {
      updateData.name = input.name;
    }

    if (input.cost_price !== undefined) {
      updateData.cost_price = input.cost_price.toString();
    }

    if (input.markup_percentage !== undefined) {
      updateData.markup_percentage = input.markup_percentage.toString();
    }

    // Always update selling_price if cost_price or markup_percentage changed
    if (input.cost_price !== undefined || input.markup_percentage !== undefined) {
      updateData.selling_price = finalSellingPrice.toString();
    }

    // Update the service
    const result = await db.update(servicesTable)
      .set(updateData)
      .where(eq(servicesTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers
    const updatedService = result[0];
    return {
      ...updatedService,
      cost_price: parseFloat(updatedService.cost_price),
      markup_percentage: parseFloat(updatedService.markup_percentage),
      selling_price: parseFloat(updatedService.selling_price)
    };
  } catch (error) {
    console.error('Service update failed:', error);
    throw error;
  }
};
