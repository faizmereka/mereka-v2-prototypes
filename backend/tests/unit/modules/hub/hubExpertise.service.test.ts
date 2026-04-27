import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Mongoose models BEFORE imports
vi.mock('@core/models/Expertise');

// Import after mocks
import {
  AvailabilityType,
  Expertise,
  ExpertiseMode,
  ExpertiseStatus,
  LinkMode,
  TicketType,
} from '@core/models/Expertise';
import { hubExpertiseService } from '@services/hub';

describe('ExpertiseService', () => {
  const mockUserId = '507f1f77bcf86cd799439011';
  const mockHubId = '507f1f77bcf86cd799439012';
  const mockExpertiseId = '507f1f77bcf86cd799439013';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validExpertiseData = {
    expertiseTitle: 'Professional Photography Workshop',
    expertiseDescription: 'Learn professional photography techniques',
    expertiseSummary: 'A comprehensive photography workshop for beginners',
    host: {
      id: mockUserId,
      name: 'John Doe',
      profileUrl: 'https://example.com/john',
      description: 'Professional photographer',
    },
    expertiseTypes: ['workshop', 'photography'],
    primaryLanguage: 'English',
    secondaryLanguages: ['Malay'],
    slug: 'professional-photography-workshop',
    location: {
      autofill: false,
      address: '123 Main St',
      country: 'Malaysia',
      state: 'Kuala Lumpur',
      city: 'KL',
      lat: 3.139,
      lng: 101.6869,
    },
    linkMode: LinkMode.SEND,
    coverPhoto: 'https://example.com/photo.jpg',
    gallery: ['https://example.com/gallery1.jpg'],
    ticket: [
      {
        id: 'ticket-1',
        ticketName: 'Standard Ticket',
        ticketType: TicketType.PAID,
        standardRate: 100,
        ticketQty: 20,
        expertiseMode: ExpertiseMode.PHYSICAL,
        sessionDuration: '2 hours',
        hasBufferTime: false,
        flexibleBooking: false,
        canRequestForSession: false,
        hasCutoffTime: false,
      },
    ],
    hubId: mockHubId,
    createdBy: mockUserId,
    status: ExpertiseStatus.DRAFT,
    currency: 'MYR',
    availabilityType: AvailabilityType.MANUAL,
    feePaidBy: 'learner',
    displayFullAddress: false,
    isDisabled: false,
    mandatoryQuestionsForBooking: false,
    materialProvided: [],
    materialNeedToBring: [],
  };

  describe('upsertExpertise', () => {
    it('should create new expertise successfully', async () => {
      const mockExpertise = {
        _id: mockExpertiseId,
        ...validExpertiseData,
        createdDate: new Date(),
        lastModified: new Date(),
      };

      // Mock slug uniqueness check
      vi.mocked(Expertise.findOne).mockResolvedValue(null);

      // Mock create
      vi.mocked(Expertise.create).mockResolvedValue(mockExpertise as any);

      // Mock populate chain for findById
      const mockPopulateChain = {
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockExpertise),
      };
      vi.mocked(Expertise.findById).mockReturnValue(mockPopulateChain as any);

      const result = await hubExpertiseService.upsertExpertise(validExpertiseData);

      expect(Expertise.findOne).toHaveBeenCalledWith({ slug: validExpertiseData.slug });
      expect(Expertise.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...validExpertiseData,
          createdDate: expect.any(Date),
          lastModified: expect.any(Date),
        }),
      );
      expect(result).toEqual(mockExpertise);
    });

    it('should throw error if slug already exists', async () => {
      const existingExpertise = { _id: 'existing-id', slug: validExpertiseData.slug };
      vi.mocked(Expertise.findOne).mockResolvedValue(existingExpertise as any);

      await expect(hubExpertiseService.upsertExpertise(validExpertiseData)).rejects.toThrow(
        'Slug already exists',
      );

      expect(Expertise.create).not.toHaveBeenCalled();
    });

    it('should update existing expertise when ID is provided', async () => {
      const existingExpertise = { _id: mockExpertiseId, ...validExpertiseData };
      const updatedData = { ...validExpertiseData, expertiseTitle: 'Updated Title' };
      const updatedExpertise = { _id: mockExpertiseId, ...updatedData };

      // Mock findById for existence check
      vi.mocked(Expertise.findById).mockResolvedValue(existingExpertise as any);

      // Mock findByIdAndUpdate with populate chain
      const mockPopulateChain = {
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(updatedExpertise),
      };
      vi.mocked(Expertise.findByIdAndUpdate).mockReturnValue(mockPopulateChain as any);

      const result = await hubExpertiseService.upsertExpertise(updatedData, mockExpertiseId);

      expect(Expertise.findById).toHaveBeenCalledWith(mockExpertiseId);
      expect(Expertise.findByIdAndUpdate).toHaveBeenCalledWith(
        mockExpertiseId,
        expect.objectContaining({
          ...updatedData,
          lastModified: expect.any(Date),
        }),
        { new: true, runValidators: true },
      );
      expect(result?.expertiseTitle).toBe('Updated Title');
    });

    it('should throw error when updating non-existent expertise', async () => {
      vi.mocked(Expertise.findById).mockResolvedValue(null);

      await expect(
        hubExpertiseService.upsertExpertise(validExpertiseData, mockExpertiseId),
      ).rejects.toThrow('Expertise not found');
    });
  });

  describe('getExpertiseById', () => {
    it('should get expertise by id successfully', async () => {
      const mockExpertise = {
        _id: mockExpertiseId,
        ...validExpertiseData,
      };

      const mockPopulateChain = {
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockExpertise),
      };
      vi.mocked(Expertise.findById).mockReturnValue(mockPopulateChain as any);

      const result = await hubExpertiseService.getExpertiseById({ id: mockExpertiseId });

      expect(Expertise.findById).toHaveBeenCalledWith(mockExpertiseId);
      expect(result).toEqual(mockExpertise);
    });

    it('should throw error if expertise not found', async () => {
      const mockPopulateChain = {
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(null),
      };
      vi.mocked(Expertise.findById).mockReturnValue(mockPopulateChain as any);

      await expect(hubExpertiseService.getExpertiseById({ id: mockExpertiseId })).rejects.toThrow(
        'Expertise not found',
      );
    });
  });

  describe('queryExpertises', () => {
    it('should query expertises with default pagination', async () => {
      const mockExpertises = [
        { _id: '1', expertiseTitle: 'Expertise 1' },
        { _id: '2', expertiseTitle: 'Expertise 2' },
      ];

      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockExpertises),
      };

      vi.mocked(Expertise.find).mockReturnValue(mockQuery as any);
      vi.mocked(Expertise.countDocuments).mockResolvedValue(2);

      const result = await hubExpertiseService.queryExpertises({
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(result.expertises).toEqual(mockExpertises);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      });
    });

    it('should filter expertises by hubId', async () => {
      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(Expertise.find).mockReturnValue(mockQuery as any);
      vi.mocked(Expertise.countDocuments).mockResolvedValue(0);

      await hubExpertiseService.queryExpertises({
        hubId: mockHubId,
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(Expertise.find).toHaveBeenCalledWith(
        expect.objectContaining({
          hubId: expect.any(Object),
        }),
      );
    });

    it('should filter expertises by status', async () => {
      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(Expertise.find).mockReturnValue(mockQuery as any);
      vi.mocked(Expertise.countDocuments).mockResolvedValue(0);

      await hubExpertiseService.queryExpertises({
        status: ExpertiseStatus.PUBLISHED,
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(Expertise.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ExpertiseStatus.PUBLISHED,
        }),
      );
    });

    it('should support pagination', async () => {
      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(Expertise.find).mockReturnValue(mockQuery as any);
      vi.mocked(Expertise.countDocuments).mockResolvedValue(50);

      const result = await hubExpertiseService.queryExpertises({
        page: 2,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(mockQuery.skip).toHaveBeenCalledWith(10); // (page 2 - 1) * 10
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
      expect(result.pagination.totalPages).toBe(5); // 50 / 10
    });
  });

  describe('deleteExpertise', () => {
    it('should delete expertise successfully', async () => {
      const mockExpertise = { _id: mockExpertiseId, expertiseTitle: 'To be deleted' };
      vi.mocked(Expertise.findByIdAndDelete).mockResolvedValue(mockExpertise as any);

      const result = await hubExpertiseService.deleteExpertise({ id: mockExpertiseId });

      expect(Expertise.findByIdAndDelete).toHaveBeenCalledWith(mockExpertiseId);
      expect(result.message).toBe('Expertise deleted successfully');
    });

    it('should throw error if expertise not found', async () => {
      vi.mocked(Expertise.findByIdAndDelete).mockResolvedValue(null);

      await expect(hubExpertiseService.deleteExpertise({ id: mockExpertiseId })).rejects.toThrow(
        'Expertise not found',
      );
    });
  });

  describe('publishExpertise', () => {
    it('should publish expertise successfully', async () => {
      const mockExpertise = {
        _id: mockExpertiseId,
        status: ExpertiseStatus.PUBLISHED,
        lastModified: new Date(),
      };

      vi.mocked(Expertise.findByIdAndUpdate).mockResolvedValue(mockExpertise as any);

      const result = await hubExpertiseService.publishExpertise(mockExpertiseId);

      expect(Expertise.findByIdAndUpdate).toHaveBeenCalledWith(
        mockExpertiseId,
        expect.objectContaining({
          status: ExpertiseStatus.PUBLISHED,
          lastModified: expect.any(Date),
        }),
        { new: true },
      );
      expect(result?.status).toBe(ExpertiseStatus.PUBLISHED);
    });

    it('should throw error if expertise not found', async () => {
      vi.mocked(Expertise.findByIdAndUpdate).mockResolvedValue(null);

      await expect(hubExpertiseService.publishExpertise(mockExpertiseId)).rejects.toThrow(
        'Expertise not found',
      );
    });
  });

  describe('archiveExpertise', () => {
    it('should archive expertise successfully', async () => {
      const mockExpertise = {
        _id: mockExpertiseId,
        status: ExpertiseStatus.ARCHIVED,
        lastModified: new Date(),
      };

      vi.mocked(Expertise.findByIdAndUpdate).mockResolvedValue(mockExpertise as any);

      const result = await hubExpertiseService.archiveExpertise(mockExpertiseId);

      expect(Expertise.findByIdAndUpdate).toHaveBeenCalledWith(
        mockExpertiseId,
        expect.objectContaining({
          status: ExpertiseStatus.ARCHIVED,
          lastModified: expect.any(Date),
        }),
        { new: true },
      );
      expect(result?.status).toBe(ExpertiseStatus.ARCHIVED);
    });

    it('should throw error if expertise not found', async () => {
      vi.mocked(Expertise.findByIdAndUpdate).mockResolvedValue(null);

      await expect(hubExpertiseService.archiveExpertise(mockExpertiseId)).rejects.toThrow(
        'Expertise not found',
      );
    });
  });
});
