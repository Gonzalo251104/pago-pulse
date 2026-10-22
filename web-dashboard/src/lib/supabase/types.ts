export type WalletProvider = "YAPE" | "PLIN";
export type PaymentStatus = "UNCLAIMED" | "CLAIMED" | "FLAGGED";
export type MemberRole = "OWNER" | "CASHIER";

export interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface OrganizationMemberRow {
  id: string;
  organization_id: string;
  user_id: string;
  role: MemberRole;
  created_at: string;
}

export interface ListenerDeviceRow {
  id: string;
  organization_id: string;
  device_name: string;
  webhook_secret: string;
  last_heartbeat_at: string | null;
  battery_level: number | null;
  is_active: boolean;
  created_at: string;
}

export interface PaymentTransactionRow {
  id: string;
  organization_id: string;
  device_id: string | null;
  idempotency_key: string;
  wallet: WalletProvider;
  amount: number;
  currency: string;
  sender_name: string;
  security_code: string | null;
  raw_notification: string;
  status: PaymentStatus;
  order_reference: string | null;
  claimed_by: string | null;
  notified_at: string;
  claimed_at: string | null;
  created_at: string;
}
