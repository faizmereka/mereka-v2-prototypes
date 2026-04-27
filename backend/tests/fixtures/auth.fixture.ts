import { Subscription } from '@core/models/Subscription';
import { AuthProvider, type IUser, User, UserStatus } from '@core/models/User';
import { TokenService } from '@services/auth';

/**
 * Test user credentials that can be reused across all test files
 */
export const TEST_USERS = {
  SOAR_USER: {
    email: 'soar-user@test.com',
    name: 'Soar Test User',
    password: 'TestPassword123!',
    status: UserStatus.ACTIVE,
    authProviders: [AuthProvider.EMAIL],
    emailVerified: true,
  },
  SCALE_USER: {
    email: 'scale-user@test.com',
    name: 'Scale Test User',
    password: 'TestPassword123!',
    status: UserStatus.ACTIVE,
    authProviders: [AuthProvider.EMAIL],
    emailVerified: true,
  },
  STARTER_USER: {
    email: 'starter-user@test.com',
    name: 'Starter Test User',
    password: 'TestPassword123!',
    status: UserStatus.ACTIVE,
    authProviders: [AuthProvider.EMAIL],
    emailVerified: true,
  },
} as const;

/**
 * Test subscription plan IDs (from Stripe)
 */
export const TEST_PLAN_IDS = {
  SOAR: 'price_soar_monthly_test',
  SCALE: 'price_scale_monthly_test',
  STARTER: 'price_starter_monthly_test',
} as const;

/**
 * Auth helper to create test user and generate token
 */
export class AuthTestHelper {
  private tokenService = new TokenService();

  /**
   * Create a test user with Soar plan and return auth token
   */
  async createSoarUser(): Promise<{ user: IUser; token: string; userId: string }> {
    const user = await User.create(TEST_USERS.SOAR_USER);

    const currentPeriodStart = new Date();
    const currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Create active subscription for Soar plan
    await Subscription.create({
      userId: String(user._id),
      stripeCustomerId: `cus_test_soar_${Date.now()}`,
      stripeSubscriptionId: `sub_test_soar_${Date.now()}`,
      planCode: 'soar',
      status: 'active',
      billingCycle: 'monthly',
      price: 4900, // $49.00 in cents
      currency: 'USD',
      currentPeriodStart,
      currentPeriodEnd,
      nextBillingDate: currentPeriodEnd,
      createdBy: String(user._id),
      lastUpdatedBy: String(user._id),
    });

    const token = this.tokenService.generateAccessToken(user);

    return {
      user,
      token,
      userId: String(user._id),
    };
  }

  /**
   * Create a test user with Scale plan and return auth token
   */
  async createScaleUser(): Promise<{ user: IUser; token: string; userId: string }> {
    const user = await User.create(TEST_USERS.SCALE_USER);

    const currentPeriodStart = new Date();
    const currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Create active subscription for Scale plan
    await Subscription.create({
      userId: String(user._id),
      stripeCustomerId: `cus_test_scale_${Date.now()}`,
      stripeSubscriptionId: `sub_test_scale_${Date.now()}`,
      planCode: 'scale',
      status: 'active',
      billingCycle: 'monthly',
      price: 9900, // $99.00 in cents
      currency: 'USD',
      currentPeriodStart,
      currentPeriodEnd,
      nextBillingDate: currentPeriodEnd,
      createdBy: String(user._id),
      lastUpdatedBy: String(user._id),
    });

    const token = this.tokenService.generateAccessToken(user);

    return {
      user,
      token,
      userId: String(user._id),
    };
  }

  /**
   * Create a test user with Starter plan and return auth token
   */
  async createStarterUser(): Promise<{ user: IUser; token: string; userId: string }> {
    const user = await User.create(TEST_USERS.STARTER_USER);

    const currentPeriodStart = new Date();
    const currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Create active subscription for Starter plan
    await Subscription.create({
      userId: String(user._id),
      stripeCustomerId: `cus_test_starter_${Date.now()}`,
      stripeSubscriptionId: `sub_test_starter_${Date.now()}`,
      planCode: 'soar', // Note: planCode can only be 'scale' or 'soar' per schema
      status: 'active',
      billingCycle: 'monthly',
      price: 0, // Free plan
      currency: 'USD',
      currentPeriodStart,
      currentPeriodEnd,
      nextBillingDate: currentPeriodEnd,
      createdBy: String(user._id),
      lastUpdatedBy: String(user._id),
    });

    const token = this.tokenService.generateAccessToken(user);

    return {
      user,
      token,
      userId: String(user._id),
    };
  }

  /**
   * Create a user without any subscription
   */
  async createUserWithoutPlan(): Promise<{ user: IUser; token: string; userId: string }> {
    const user = await User.create({
      email: 'no-plan@test.com',
      name: 'No Plan User',
      status: UserStatus.ACTIVE,
      authProviders: [AuthProvider.EMAIL],
      emailVerified: true,
    });

    const token = this.tokenService.generateAccessToken(user);

    return {
      user,
      token,
      userId: String(user._id),
    };
  }

  /**
   * Generate token for existing user
   */
  generateToken(user: IUser): string {
    return this.tokenService.generateAccessToken(user);
  }
}

/**
 * Reusable auth header helper
 */
export function getAuthHeader(token: string): Record<string, string> {
  return {
    authorization: `Bearer ${token}`,
  };
}
