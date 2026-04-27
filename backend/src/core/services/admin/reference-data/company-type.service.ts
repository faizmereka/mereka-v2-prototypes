import { CompanyType, type ICompanyType } from '@core/models/CompanyType';

/**
 * CompanyType Service
 * Handles business logic for company types
 */
export class CompanyTypeService {
  /**
   * Get all company types (active by default)
   */
  async getAll(includeInactive = false): Promise<ICompanyType[]> {
    const filter = includeInactive ? {} : { isActive: true };
    return CompanyType.find(filter)
      .sort({ priority: 1, name: 1 })
      .lean() as unknown as ICompanyType[];
  }

  /**
   * Get company type by ID
   */
  async getById(id: string): Promise<ICompanyType | null> {
    return CompanyType.findById(id).lean() as unknown as ICompanyType | null;
  }

  /**
   * Create new company type
   */
  async create(data: Partial<ICompanyType>): Promise<ICompanyType> {
    // Check for duplicate name
    if (data.name) {
      const existing = await CompanyType.findOne({ name: data.name });
      if (existing) {
        throw new Error('Company type with this name already exists');
      }
    }

    return CompanyType.create(data) as unknown as ICompanyType;
  }

  /**
   * Update company type
   */
  async update(id: string, data: Partial<ICompanyType>): Promise<ICompanyType | null> {
    // If name is being updated, check for duplicates
    if (data.name) {
      const existing = await CompanyType.findOne({
        name: data.name,
        _id: { $ne: id },
      });
      if (existing) {
        throw new Error('Company type with this name already exists');
      }
    }

    return CompanyType.findByIdAndUpdate(id, data, {
      new: true,
    }).lean() as unknown as ICompanyType | null;
  }

  /**
   * Delete company type (soft delete - set isActive to false)
   */
  async delete(id: string): Promise<ICompanyType | null> {
    return CompanyType.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true },
    ).lean() as unknown as ICompanyType | null;
  }
}

export const companyTypeService = new CompanyTypeService();
