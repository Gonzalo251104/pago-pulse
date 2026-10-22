-- Development seed data for local testing with scripts/simulate-payment.ts
INSERT INTO organizations (id, name, slug)
VALUES (
    '00000000-0000-4000-8000-000000000099',
    'Bodega Don Pepe (Demo)',
    'bodega-don-pepe'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO listener_devices (
    id,
    organization_id,
    device_name,
    webhook_secret,
    battery_level,
    is_active
)
VALUES (
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000099',
    'Xiaomi Redmi Note 13 - Caja Principal',
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    95,
    true
)
ON CONFLICT (id) DO NOTHING;
