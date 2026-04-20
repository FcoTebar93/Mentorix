export type UUID = string;
export type ISODateString = string;

export type AccessLinkStatus = "active" | "revoked" | "expired";

export interface InterviewAccessLink {
  id: UUID;
  templateId: UUID;
  ownerUserId: UUID;
  tokenHash: string;
  status: AccessLinkStatus;
  maxUses?: number;
  usedCount: number;
  expiresAt?: ISODateString;
  createdAt: ISODateString;
  revokedAt?: ISODateString;
}