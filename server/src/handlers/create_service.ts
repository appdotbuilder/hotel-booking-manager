
import { db } from '../db';
import { servicesTable } from '../db/schema';
import { type CreateServiceInput, type Service } from '../schema';

export const createService = async (input: CreateServiceInput): Promise<Service> => {
  try {
    // Calculate selling price: cost_price + (markup_percentage * cost_price)
    const selling_price = input.cost_price + (input.markup_percentage / 100 * input.cost_price);

    // Insert service record
    const result = await db.insert(servicesTable)
      .values({
        name: input.name,
        cost_price: input.cost_price.toString(), // Convert number to string for numeric column
        markup_percentage: input.markup_percentage.toString(), // Convert number to string for numeric column
        selling_price: selling_price.toString() // Convert calculated number to string for numeric column
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const service = result[0];
    return {
      ...service,
      cost_price: parseFloat(service.cost_price), // Convert string back to number
      markup_percentage: parseFloat(service.markup_percentage), // Convert string back to number
      selling_price: parseFloat(service.selling_price) // Convert string back to number
    };
  } catch (error) {
    console.error('Service creation failed:', error);
    throw error;
  }
};
