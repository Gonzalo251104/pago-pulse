/**
 * CLI Payment & Heartbeat Webhook Simulator for PagoPulse
 *
 * Sends HMAC-SHA256 signed requests to `/api/v1/ingest` (or `/api/v1/heartbeat`)
 * so developers can test the Next.js backend and real-time dashboard without
 * needing a physical Android device.
 *
 * Usage examples:
 *   npm run simulate:payment
 *   npm run simulate:payment -- --wallet=YAPE --amount=45.50 --sender="Carlos Mendoza" --code=842
 *   npm run simulate:payment -- --wallet=PLIN --amount=120.00 --sender="Lucía Fernández"
 *   npm run simulate:payment -- --duplicate
 *   npm run simulate:payment -- --heartbeat --battery=92
 */

import {
  computeHmacSignature,
  computeIdempotencyKey,
} from "../src/lib/security/verify-hmac";
import type { WalletProvider } from "../src/lib/validators/ingest.schema";

interface CliOptions {
  apiUrl: string;
  deviceId: string;
  secret: string;
  wallet: WalletProvider;
  amount: number;
  sender: string;
  securityCode: string | null;
  idempotencyKey?: string;
  duplicate: boolean;
  heartbeat: boolean;
  battery: number;
}

const SAMPLE_SENDERS = [
  "Carlos Mendoza",
  "María Elena Quispe",
  "Jorge Luis Huamán",
  "Lucía Fernández",
  "Diego Alejandro Vargas",
  "Rosa Angélica Chávez",
];

function parseArgs(argv: string[]): CliOptions {
  const args = new Map<string, string | boolean>();

  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const [rawKey, ...rest] = arg.slice(2).split("=");
    const value = rest.length > 0 ? rest.join("=") : true;
    args.set(rawKey, value);
  }

  const walletArg = String(args.get("wallet") ?? "YAPE").toUpperCase();
  const wallet: WalletProvider = walletArg === "PLIN" ? "PLIN" : "YAPE";

  const randomAmount = Number((Math.floor(Math.random() * 15000 + 500) / 100).toFixed(2));
  const amount = args.has("amount")
    ? Number(args.get("amount"))
    : randomAmount;

  const sender = args.has("sender")
    ? String(args.get("sender"))
    : SAMPLE_SENDERS[Math.floor(Math.random() * SAMPLE_SENDERS.length)];

  const defaultCode =
    wallet === "YAPE"
      ? String(Math.floor(100 + Math.random() * 900))
      : null;

  const securityCode = args.has("code")
    ? String(args.get("code"))
    : defaultCode;

  return {
    apiUrl:
      (args.get("api-url") as string) ??
      process.env.SIMULATOR_API_URL ??
      "http://localhost:3000",
    deviceId:
      (args.get("device-id") as string) ??
      process.env.SIMULATOR_DEVICE_ID ??
      "00000000-0000-4000-8000-000000000001",
    secret:
      (args.get("secret") as string) ??
      process.env.SIMULATOR_WEBHOOK_SECRET ??
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    wallet,
    amount,
    sender,
    securityCode,
    idempotencyKey: args.get("idempotency-key") as string | undefined,
    duplicate: Boolean(args.get("duplicate")),
    heartbeat: Boolean(args.get("heartbeat")),
    battery: args.has("battery") ? Number(args.get("battery")) : 85,
  };
}

function buildRawNotification(
  wallet: WalletProvider,
  senderName: string,
  amount: number,
  securityCode: string | null
): string {
  const formattedAmount = amount.toFixed(2);
  if (wallet === "YAPE") {
    return securityCode
      ? `Confirmación de Pago. ${senderName} te envió un pago por S/ ${formattedAmount}. El código de seguridad es: ${securityCode}`
      : `Yape! ${senderName} te envió S/ ${formattedAmount}`;
  }
  return `${senderName} te ha plineado S/ ${formattedAmount}`;
}

async function sendSignedWebhook(
  url: string,
  deviceId: string,
  secret: string,
  payload: unknown
) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const rawBody = JSON.stringify(payload);
  const signature = computeHmacSignature(secret, timestamp, rawBody);

  console.log(`\n-> POST ${url}`);
  console.log(`   X-Device-Id : ${deviceId}`);
  console.log(`   X-Timestamp : ${timestamp}`);
  console.log(`   X-Signature : ${signature}`);
  console.log(`   Payload     : ${rawBody}`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Device-Id": deviceId,
      "X-Timestamp": timestamp,
      "X-Signature": signature,
    },
    body: rawBody,
  });

  const responseText = await response.text();
  console.log(`<- Status ${response.status} ${response.statusText}`);
  console.log(`   Response    : ${responseText}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.heartbeat) {
    await sendSignedWebhook(
      `${options.apiUrl}/api/v1/heartbeat`,
      options.deviceId,
      options.secret,
      { batteryLevel: options.battery }
    );
    return;
  }

  const notifiedAt = new Date().toISOString();
  const rawNotification = buildRawNotification(
    options.wallet,
    options.sender,
    options.amount,
    options.securityCode
  );

  const idempotencyKey =
    options.idempotencyKey ??
    computeIdempotencyKey(
      `${options.deviceId}|${options.wallet}|${options.amount.toFixed(2)}|${options.sender}|${options.securityCode ?? ""}|${notifiedAt}`
    );

  const payload = {
    idempotencyKey,
    wallet: options.wallet,
    amount: options.amount,
    senderName: options.sender,
    securityCode: options.securityCode,
    rawNotification,
    notifiedAt,
  };

  const ingestUrl = `${options.apiUrl}/api/v1/ingest`;
  await sendSignedWebhook(
    ingestUrl,
    options.deviceId,
    options.secret,
    payload
  );

  if (options.duplicate) {
    console.log("\n[Simulating duplicate retry with identical idempotencyKey...]");
    await sendSignedWebhook(
      ingestUrl,
      options.deviceId,
      options.secret,
      payload
    );
  }
}

main().catch((err) => {
  console.error("\n[Simulator Error]:", err.message || err);
  process.exit(1);
});
