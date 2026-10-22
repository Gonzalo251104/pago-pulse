CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE wallet_provider AS ENUM ('YAPE', 'PLIN');
CREATE TYPE payment_status AS ENUM ('UNCLAIMED', 'CLAIMED', 'FLAGGED');
CREATE TYPE member_role AS ENUM ('OWNER', 'CASHIER');

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role member_role NOT NULL DEFAULT 'CASHIER',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, user_id)
);

CREATE TABLE listener_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    device_name TEXT NOT NULL,
    webhook_secret TEXT NOT NULL, -- 64-char hex secret for HMAC-SHA256
    last_heartbeat_at TIMESTAMPTZ,
    battery_level INT CHECK (battery_level IS NULL OR (battery_level >= 0 AND battery_level <= 100)),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    device_id UUID REFERENCES listener_devices(id) ON DELETE SET NULL,
    idempotency_key TEXT NOT NULL UNIQUE,
    wallet wallet_provider NOT NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'PEN',
    sender_name TEXT NOT NULL,
    security_code TEXT,
    raw_notification TEXT NOT NULL,
    status payment_status NOT NULL DEFAULT 'UNCLAIMED',
    order_reference TEXT,
    claimed_by UUID REFERENCES auth.users(id),
    notified_at TIMESTAMPTZ NOT NULL,
    claimed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_org_status ON payment_transactions(organization_id, status, notified_at DESC);
CREATE INDEX idx_listener_devices_org ON listener_devices(organization_id) WHERE is_active = true;

-- Row Level Security (RLS)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE listener_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated dashboard users (Organization Members)
CREATE POLICY "Members can view their organizations"
    ON organizations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.organization_id = organizations.id
              AND om.user_id = auth.uid()
        )
    );

CREATE POLICY "Members can view organization memberships"
    ON organization_members FOR SELECT
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.organization_id = organization_members.organization_id
              AND om.user_id = auth.uid()
        )
    );

CREATE POLICY "Members can view organization devices"
    ON listener_devices FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.organization_id = listener_devices.organization_id
              AND om.user_id = auth.uid()
        )
    );

CREATE POLICY "Owners can manage organization devices"
    ON listener_devices FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.organization_id = listener_devices.organization_id
              AND om.user_id = auth.uid()
              AND om.role = 'OWNER'
        )
    );

CREATE POLICY "Members can view organization payments"
    ON payment_transactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.organization_id = payment_transactions.organization_id
              AND om.user_id = auth.uid()
        )
    );

CREATE POLICY "Members can claim or update organization payments"
    ON payment_transactions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.organization_id = payment_transactions.organization_id
              AND om.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.organization_id = payment_transactions.organization_id
              AND om.user_id = auth.uid()
        )
    );

-- Enable Realtime on payment_transactions
ALTER PUBLICATION supabase_realtime ADD TABLE payment_transactions;
