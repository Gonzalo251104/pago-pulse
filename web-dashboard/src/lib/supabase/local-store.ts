import fs from "node:fs";
import path from "node:path";
import type {
  ListenerDeviceRow,
  PaymentStatus,
  PaymentTransactionRow,
} from "@/lib/supabase/types";
import {
  DEMO_DEVICE_ID,
  DEMO_ORG_ID,
  DEMO_WEBHOOK_SECRET,
} from "@/lib/auth/session";

interface LocalStoreData {
  devices: ListenerDeviceRow[];
  payments: PaymentTransactionRow[];
}

const STORE_FILE_PATH = path.join(
  process.cwd(),
  ".next",
  "pagopulse-local-store.json"
);

function getInitialStoreData(): LocalStoreData {
  const now = Date.now();
  return {
    devices: [
      {
        id: DEMO_DEVICE_ID,
        organization_id: DEMO_ORG_ID,
        device_name: "Xiaomi Redmi Note 13 — Caja Principal",
        webhook_secret: DEMO_WEBHOOK_SECRET,
        last_heartbeat_at: new Date(now - 25_000).toISOString(),
        battery_level: 92,
        is_active: true,
        created_at: new Date(now - 86_400_000 * 7).toISOString(),
      },
    ],
    payments: [
      {
        id: "00000000-0000-4000-8000-000000000101",
        organization_id: DEMO_ORG_ID,
        device_id: DEMO_DEVICE_ID,
        idempotency_key:
          "1111111111111111111111111111111111111111111111111111111111111101",
        wallet: "YAPE",
        amount: 45.5,
        currency: "PEN",
        sender_name: "Carlos Mendoza",
        security_code: "842",
        raw_notification:
          "Confirmación de Pago. Carlos Mendoza te envió un pago por S/ 45.50. El código de seguridad es: 842",
        status: "UNCLAIMED",
        order_reference: null,
        claimed_by: null,
        notified_at: new Date(now - 45_000).toISOString(),
        claimed_at: null,
        created_at: new Date(now - 45_000).toISOString(),
      },
      {
        id: "00000000-0000-4000-8000-000000000102",
        organization_id: DEMO_ORG_ID,
        device_id: DEMO_DEVICE_ID,
        idempotency_key:
          "1111111111111111111111111111111111111111111111111111111111111102",
        wallet: "PLIN",
        amount: 28.0,
        currency: "PEN",
        sender_name: "Lucía Fernández",
        security_code: null,
        raw_notification: "Lucía Fernández te ha plineado S/ 28.00",
        status: "UNCLAIMED",
        order_reference: null,
        claimed_by: null,
        notified_at: new Date(now - 180_000).toISOString(),
        claimed_at: null,
        created_at: new Date(now - 180_000).toISOString(),
      },
      {
        id: "00000000-0000-4000-8000-000000000103",
        organization_id: DEMO_ORG_ID,
        device_id: DEMO_DEVICE_ID,
        idempotency_key:
          "1111111111111111111111111111111111111111111111111111111111111103",
        wallet: "YAPE",
        amount: 64.9,
        currency: "PEN",
        sender_name: "María Elena Quispe",
        security_code: "319",
        raw_notification:
          "Confirmación de Pago. María Elena Quispe te envió un pago por S/ 64.90. El código de seguridad es: 319",
        status: "CLAIMED",
        order_reference: "Mesa 4",
        claimed_by: "00000000-0000-4000-8000-000000000011",
        notified_at: new Date(now - 600_000).toISOString(),
        claimed_at: new Date(now - 540_000).toISOString(),
        created_at: new Date(now - 600_000).toISOString(),
      },
    ],
  };
}

export function readLocalStore(): LocalStoreData {
  try {
    if (fs.existsSync(STORE_FILE_PATH)) {
      const content = fs.readFileSync(STORE_FILE_PATH, "utf8");
      return JSON.parse(content) as LocalStoreData;
    }
  } catch {
    // Fall back to initial data if file read fails
  }
  const initial = getInitialStoreData();
  writeLocalStore(initial);
  return initial;
}

export function writeLocalStore(data: LocalStoreData): void {
  try {
    const dir = path.dirname(STORE_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch {
    // Ignore write errors in read-only environments
  }
}

export function claimLocalPayment(
  paymentId: string,
  orderReference: string | null,
  claimedByUserId: string,
  status: PaymentStatus = "CLAIMED"
): PaymentTransactionRow | null {
  const store = readLocalStore();
  const idx = store.payments.findIndex((p) => p.id === paymentId);
  if (idx === -1) return null;

  const updated: PaymentTransactionRow = {
    ...store.payments[idx],
    status,
    order_reference: orderReference,
    claimed_by: claimedByUserId,
    claimed_at: new Date().toISOString(),
  };

  store.payments[idx] = updated;
  writeLocalStore(store);
  return updated;
}

export function registerLocalDevice(
  deviceName: string,
  organizationId: string = DEMO_ORG_ID
): ListenerDeviceRow {
  const store = readLocalStore();
  const randomHex = Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");

  const newDevice: ListenerDeviceRow = {
    id: crypto.randomUUID(),
    organization_id: organizationId,
    device_name: deviceName,
    webhook_secret: randomHex,
    last_heartbeat_at: null,
    battery_level: null,
    is_active: true,
    created_at: new Date().toISOString(),
  };

  store.devices.unshift(newDevice);
  writeLocalStore(store);
  return newDevice;
}

/**
 * Provides a Supabase-compatible query builder backed by the local JSON store
 * when a live Supabase instance is not configured.
 */
export function createLocalSupabaseFallbackClient() {
  return {
    from(table: string) {
      if (table === "listener_devices") {
        return {
          select() {
            return {
              eq(col: string, val: string) {
                return {
                  async single() {
                    const store = readLocalStore();
                    const found = store.devices.find(
                      (d) => (d as unknown as Record<string, unknown>)[col] === val
                    );
                    return {
                      data: found ?? null,
                      error: found ? null : { message: "Device not found" },
                    };
                  },
                };
              },
            };
          },
          update(updates: Partial<ListenerDeviceRow>) {
            return {
              async eq(col: string, val: string) {
                const store = readLocalStore();
                const idx = store.devices.findIndex(
                  (d) => (d as unknown as Record<string, unknown>)[col] === val
                );
                if (idx === -1) {
                  return { error: { message: "Device not found" } };
                }
                store.devices[idx] = {
                  ...store.devices[idx],
                  ...updates,
                };
                writeLocalStore(store);
                return { error: null };
              },
            };
          },
        };
      }

      if (table === "payment_transactions") {
        return {
          insert(row: Omit<PaymentTransactionRow, "id" | "created_at" | "order_reference" | "claimed_by" | "claimed_at">) {
            return {
              select() {
                return {
                  async single() {
                    const store = readLocalStore();
                    const duplicate = store.payments.find(
                      (p) => p.idempotency_key === row.idempotency_key
                    );
                    if (duplicate) {
                      return {
                        data: null,
                        error: {
                          code: "23505",
                          message:
                            "duplicate key value violates unique constraint",
                        },
                      };
                    }

                    const created: PaymentTransactionRow = {
                      id: crypto.randomUUID(),
                      organization_id: row.organization_id,
                      device_id: row.device_id ?? null,
                      idempotency_key: row.idempotency_key,
                      wallet: row.wallet,
                      amount: Number(row.amount),
                      currency: row.currency ?? "PEN",
                      sender_name: row.sender_name,
                      security_code: row.security_code ?? null,
                      raw_notification: row.raw_notification,
                      status: row.status ?? "UNCLAIMED",
                      order_reference: null,
                      claimed_by: null,
                      notified_at: row.notified_at,
                      claimed_at: null,
                      created_at: new Date().toISOString(),
                    };

                    store.payments.unshift(created);
                    writeLocalStore(store);
                    return {
                      data: {
                        id: created.id,
                        idempotency_key: created.idempotency_key,
                        status: created.status,
                        created_at: created.created_at,
                      },
                      error: null,
                    };
                  },
                };
              },
            };
          },
          select() {
            return {
              eq(col: string, val: string) {
                return {
                  async single() {
                    const store = readLocalStore();
                    const found = store.payments.find(
                      (p) => (p as unknown as Record<string, unknown>)[col] === val
                    );
                    return {
                      data: found
                        ? {
                            id: found.id,
                            idempotency_key: found.idempotency_key,
                            status: found.status,
                            created_at: found.created_at,
                          }
                        : null,
                      error: found ? null : { message: "Payment not found" },
                    };
                  },
                };
              },
            };
          },
        };
      }

      throw new Error(`Unsupported table in local fallback store: ${table}`);
    },
  };
}
