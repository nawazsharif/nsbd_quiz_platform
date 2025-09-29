import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";

// User roles and permissions
export const USER_ROLES = {
  GUEST: 'guest',
  USER: 'user',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin'
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// Permissions
export const PERMISSIONS = {
  // Quiz permissions
  CREATE_QUIZ: 'create_quiz',
  EDIT_QUIZ: 'edit_quiz',
  DELETE_QUIZ: 'delete_quiz',
  APPROVE_QUIZ: 'approve_quiz',

  // Course permissions
  CREATE_COURSE: 'create_course',
  EDIT_COURSE: 'edit_course',
  DELETE_COURSE: 'delete_course',
  APPROVE_COURSE: 'approve_course',

  // User management
  MANAGE_USERS: 'manage_users',
  MANAGE_ROLES: 'manage_roles',

  // System permissions
  VIEW_ANALYTICS: 'view_analytics',
  MANAGE_SETTINGS: 'manage_settings',
  MANAGE_WITHDRAWALS: 'manage_withdrawals'
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Role-based permissions mapping
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [USER_ROLES.GUEST]: [],
  [USER_ROLES.USER]: [
    PERMISSIONS.CREATE_QUIZ,
    PERMISSIONS.EDIT_QUIZ,
    PERMISSIONS.DELETE_QUIZ,
    PERMISSIONS.CREATE_COURSE,
    PERMISSIONS.EDIT_COURSE,
    PERMISSIONS.DELETE_COURSE
  ],
  [USER_ROLES.ADMIN]: [
    PERMISSIONS.CREATE_QUIZ,
    PERMISSIONS.EDIT_QUIZ,
    PERMISSIONS.DELETE_QUIZ,
    PERMISSIONS.APPROVE_QUIZ,
    PERMISSIONS.CREATE_COURSE,
    PERMISSIONS.EDIT_COURSE,
    PERMISSIONS.DELETE_COURSE,
    PERMISSIONS.APPROVE_COURSE,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.MANAGE_WITHDRAWALS
  ],
  [USER_ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS)
};

// Prefer explicit API URL when provided; fallback to proxy path
const API_BASE_URL = 'http://backend/api'

// Custom user type
export interface CustomUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  permissions: Permission[];
}

export const authOptions: NextAuthOptions = {
  providers: [
    // Email/Password Authentication
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        console.log('NextAuth authorize called with:', { email: credentials?.email });

        if (!credentials?.email || !credentials?.password) {
          console.log('Missing credentials');
          return null;
        }

        try {
          console.log('Calling Laravel API at:', `${API_BASE_URL}/auth/login`);

          // Call Laravel API for authentication
          const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          console.log('Laravel API response status:', response.status);

          if (!response.ok) {
            console.log('Laravel API response not ok');
            return null;
          }

          const data = await response.json();
          console.log('Laravel API response data:', data);

          const rawUser = data?.user || data?.data?.user;
          const rawToken = data?.token || data?.data?.token;

          console.log('Extracted user and token:', { user: rawUser, token: rawToken ? 'present' : 'missing' });

          if (rawUser && rawToken) {
            // Determine role from property or first spatie role
            const rawRole: string | undefined = rawUser.role || rawUser.roles?.[0]?.name;
            const normalizedRole: UserRole =
              rawRole === 'superadmin' || rawRole === 'super_admin'
                ? USER_ROLES.SUPER_ADMIN
                : rawRole === 'admin'
                  ? USER_ROLES.ADMIN
                  : USER_ROLES.USER;

            // Use static role-permissions mapping (no extra API required)
            const permissions = ROLE_PERMISSIONS[normalizedRole] || [];

            const userResult = {
              id: String(rawUser.id),
              name: rawUser.name,
              email: rawUser.email,
              role: normalizedRole,
              avatar: rawUser.avatar,
              accessToken: rawToken,
              permissions,
            } as any;

            console.log('Returning user result:', userResult);
            return userResult;
          }

          console.log('Missing user or token in response');
          return null;
        } catch (error) {
          console.error('Authentication error:', error);
          return null;
        }
      }
    }),
    // Conditionally enable socials only if properly configured
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET })]
      : []),
    ...(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET
      ? [FacebookProvider({ clientId: process.env.FACEBOOK_CLIENT_ID, clientSecret: process.env.FACEBOOK_CLIENT_SECRET })]
      : []),
  ],

  callbacks: {
    async signIn({ user, account }) {
      console.log('NextAuth signIn callback called with:', { user, account });

      // Handle OAuth providers
      if (account?.provider === 'google' || account?.provider === 'facebook') {
        console.log('Handling OAuth provider:', account.provider);
        try {
          // Check if user exists or create new user
          const response = await fetch(`${API_BASE_URL}/auth/social/${account.provider}/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({
              provider: account.provider,
              provider_id: account.providerAccountId,
              name: user.name,
              email: user.email,
              avatar: user.image,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.user) {
              // Fetch permissions from API
              let permissions: Permission[] = [];
              try {
                const permissionsResponse = await fetch(`${API_BASE_URL}/auth/permissions`, {
                  method: 'GET',
                  headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${data.token}`,
                  },
                });

                if (permissionsResponse.ok) {
                  const permissionsData = await permissionsResponse.json();
                  permissions = permissionsData.permissions || [];
                }
              } catch {
                console.warn('Failed to fetch permissions from API, using fallback');
                // Fallback to static permissions if API fails
                permissions = ROLE_PERMISSIONS[data.user.role as UserRole || USER_ROLES.USER] || [];
              }

              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (user as any).accessToken = data.token;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (user as any).role = data.user.role;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (user as any).permissions = permissions;

              console.log('OAuth sign-in successful, returning true');
              return true;
            }
          }
          console.log('OAuth sign-in failed, returning false');
          return false;
        } catch (error) {
          console.error('OAuth sign-in error:', error);
          return false;
        }
      }

      // For credentials provider, always return true if we get here
      // (the authorize function already validated the credentials)
      console.log('Credentials provider sign-in, returning true');
      return true;
    },

    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user) {
        const customUser = user as CustomUser & { accessToken?: string };
        token.accessToken = customUser.accessToken;
        token.role = customUser.role;
        token.permissions = customUser.permissions;
        token.avatar = customUser.avatar;
      }

      return token;
    },

    async session({ session, token }) {
      // Send properties to the client
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session as any).accessToken = token.accessToken as string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session.user as any).id = token.sub!;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session.user as any).role = token.role as UserRole;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session.user as any).permissions = token.permissions as Permission[];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session.user as any).avatar = token.avatar as string;

      return session;
    },
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },

  secret: process.env.NEXTAUTH_SECRET,

  // Add debug configuration
  debug: process.env.NODE_ENV === 'development',
};
