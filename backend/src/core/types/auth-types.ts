/**
 * Authentication type definitions
 */

export interface FirebaseUserInfo {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName?: string;
  photoURL?: string;
  phoneNumber?: string;
  provider: string;
}

export interface TokenPayload {
  sub: string; // MongoDB user ID
  firebaseUid?: string;
  email: string;
  name: string;
  providers: string[]; // Array of auth providers
  domain?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RefreshTokenPayload {
  sub: string;
  type: 'refresh';
  tokenId: string;
}

export interface LoginRequest {
  firebaseToken: string;
  domain?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}
