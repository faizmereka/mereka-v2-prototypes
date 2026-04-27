/**
 * Hub invitation schemas - Native JSON Schema
 */

const objectIdPattern = '^[0-9a-fA-F]{24}$';

/**
 * Create email invitations schema
 * Supports two formats:
 * 1. Legacy: { invitations: [{ email, roleKey }] }
 * 2. Simple: { emails: string[], roleId: string }
 */
export const hubCreateEmailInvitationsSchema = {
  params: {
    type: 'object',
    required: ['hubId'],
    properties: {
      hubId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Hub ID',
      },
    },
  },
  body: {
    type: 'object',
    anyOf: [
      {
        required: ['invitations'],
        properties: {
          invitations: {
            type: 'array',
            items: {
              type: 'object',
              required: ['email', 'roleKey'],
              properties: {
                email: {
                  type: 'string',
                  format: 'email',
                  description: 'Email address',
                },
                roleKey: {
                  type: 'string',
                  minLength: 1,
                  description: 'Role key',
                },
                title: {
                  type: 'string',
                  maxLength: 100,
                  description: 'Member title',
                },
              },
            },
            minItems: 1,
            maxItems: 50,
            description: 'Array of invitations (max 50 at once)',
          },
        },
      },
      {
        required: ['emails', 'roleId'],
        properties: {
          emails: {
            type: 'array',
            items: {
              type: 'string',
              format: 'email',
            },
            minItems: 1,
            maxItems: 50,
            description: 'Array of email addresses',
          },
          roleId: {
            type: 'string',
            pattern: objectIdPattern,
            description: 'Role ID to assign to all invited users',
          },
        },
      },
    ],
  },
} as const;

/**
 * Accept email invitation schema
 */
export const hubAcceptEmailInvitationSchema = {
  params: {
    type: 'object',
    required: ['token'],
    properties: {
      token: {
        type: 'string',
        minLength: 1,
        description: 'Invitation token',
      },
    },
  },
} as const;

/**
 * Create invitation link schema
 * Accepts either roleKey or roleId
 */
export const hubCreateInvitationLinkSchema = {
  params: {
    type: 'object',
    required: ['hubId'],
    properties: {
      hubId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Hub ID',
      },
    },
  },
  body: {
    type: 'object',
    anyOf: [{ required: ['roleKey'] }, { required: ['roleId'] }],
    properties: {
      roleKey: {
        type: 'string',
        minLength: 1,
        description: 'Role key',
      },
      roleId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Role ID',
      },
      maxUses: {
        type: 'number',
        minimum: 1,
        description: 'Maximum number of uses',
      },
      expiresInDays: {
        type: 'number',
        minimum: 1,
        maximum: 90,
        default: 30,
        description: 'Expiration in days',
      },
    },
  },
} as const;

/**
 * Join via link schema
 */
export const hubJoinViaLinkSchema = {
  params: {
    type: 'object',
    required: ['token'],
    properties: {
      token: {
        type: 'string',
        minLength: 1,
        description: 'Invitation link token',
      },
    },
  },
} as const;

/**
 * List hub members schema
 */
export const hubListHubMembersSchema = {
  params: {
    type: 'object',
    required: ['hubId'],
    properties: {
      hubId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Hub ID',
      },
    },
  },
  querystring: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: ['active', 'invited', 'suspended', 'left'],
        description: 'Member status filter',
      },
      roleKey: {
        type: 'string',
        description: 'Role key filter',
      },
      search: {
        type: 'string',
        description: 'Search query',
      },
      page: {
        type: 'number',
        minimum: 1,
        default: 1,
        description: 'Page number',
      },
      limit: {
        type: 'number',
        minimum: 1,
        maximum: 100,
        default: 20,
        description: 'Items per page',
      },
    },
  },
} as const;

/**
 * List pending invitations schema
 */
export const hubListPendingInvitationsSchema = {
  params: {
    type: 'object',
    required: ['hubId'],
    properties: {
      hubId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Hub ID',
      },
    },
  },
  querystring: {
    type: 'object',
    properties: {
      page: {
        type: 'number',
        minimum: 1,
        default: 1,
        description: 'Page number',
      },
      limit: {
        type: 'number',
        minimum: 1,
        maximum: 100,
        default: 20,
        description: 'Items per page',
      },
    },
  },
} as const;

/**
 * Update member role schema
 */
export const hubUpdateMemberRoleSchema = {
  params: {
    type: 'object',
    required: ['hubId', 'memberId'],
    properties: {
      hubId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Hub ID',
      },
      memberId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Member ID',
      },
    },
  },
  body: {
    type: 'object',
    properties: {
      roleKey: {
        type: 'string',
        minLength: 1,
        description: 'New role key',
      },
      title: {
        type: 'string',
        maxLength: 100,
        description: 'Member title',
      },
    },
  },
} as const;

/**
 * Remove member schema
 */
export const hubRemoveMemberSchema = {
  params: {
    type: 'object',
    required: ['hubId', 'memberId'],
    properties: {
      hubId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Hub ID',
      },
      memberId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Member ID',
      },
    },
  },
} as const;

/**
 * Cancel invitation schema
 */
export const hubCancelInvitationSchema = {
  params: {
    type: 'object',
    required: ['hubId', 'memberId'],
    properties: {
      hubId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Hub ID',
      },
      memberId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Member ID',
      },
    },
  },
} as const;

/**
 * List invitation links schema
 */
export const hubListInvitationLinksSchema = {
  params: {
    type: 'object',
    required: ['hubId'],
    properties: {
      hubId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Hub ID',
      },
    },
  },
  querystring: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: ['active', 'expired', 'disabled'],
        description: 'Link status filter',
      },
      page: {
        type: 'number',
        minimum: 1,
        default: 1,
        description: 'Page number',
      },
      limit: {
        type: 'number',
        minimum: 1,
        maximum: 100,
        default: 20,
        description: 'Items per page',
      },
    },
  },
} as const;

/**
 * Disable invitation link schema
 */
export const hubDisableInvitationLinkSchema = {
  params: {
    type: 'object',
    required: ['hubId', 'linkId'],
    properties: {
      hubId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Hub ID',
      },
      linkId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Link ID',
      },
    },
  },
} as const;

/**
 * Update member permissions schema
 */
export const hubUpdateMemberPermissionsSchema = {
  params: {
    type: 'object',
    required: ['hubId', 'memberId'],
    properties: {
      hubId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Hub ID',
      },
      memberId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Member ID',
      },
    },
  },
  body: {
    type: 'object',
    required: ['permissions'],
    properties: {
      permissions: {
        type: 'array',
        items: {
          type: 'string',
          minLength: 1,
        },
        description:
          'Array of permission keys. Pass empty array to reset to role-based permissions.',
      },
    },
  },
} as const;

/**
 * TypeScript type definitions
 */
export interface HubCreateEmailInvitationsInput {
  params: {
    hubId: string;
  };
  body:
    | {
        invitations: Array<{
          email: string;
          roleKey: string;
          title?: string;
        }>;
      }
    | {
        emails: string[];
        roleId: string;
      };
}

export interface HubAcceptEmailInvitationInput {
  params: {
    token: string;
  };
}

export interface HubCreateInvitationLinkInput {
  params: {
    hubId: string;
  };
  body: {
    roleKey?: string;
    roleId?: string;
    maxUses?: number;
    expiresInDays?: number;
  };
}

export interface HubJoinViaLinkInput {
  params: {
    token: string;
  };
}

export interface HubListHubMembersInput {
  params: {
    hubId: string;
  };
  querystring: {
    status?: 'active' | 'invited' | 'suspended' | 'left';
    roleKey?: string;
    search?: string;
    page?: number;
    limit?: number;
  };
}

export interface HubListPendingInvitationsInput {
  params: {
    hubId: string;
  };
  querystring: {
    page?: number;
    limit?: number;
  };
}

export interface HubUpdateMemberRoleInput {
  params: {
    hubId: string;
    memberId: string;
  };
  body: {
    roleKey?: string;
    title?: string;
  };
}

export interface HubRemoveMemberInput {
  params: {
    hubId: string;
    memberId: string;
  };
}

export interface HubCancelInvitationInput {
  params: {
    hubId: string;
    memberId: string;
  };
}

export interface HubListInvitationLinksInput {
  params: {
    hubId: string;
  };
  querystring: {
    status?: 'active' | 'expired' | 'disabled';
    page?: number;
    limit?: number;
  };
}

export interface HubDisableInvitationLinkInput {
  params: {
    hubId: string;
    linkId: string;
  };
}

export interface HubUpdateMemberPermissionsInput {
  params: {
    hubId: string;
    memberId: string;
  };
  body: {
    permissions: string[];
  };
}
