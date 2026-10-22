import { NextRequest, NextResponse } from "next/server";
import {
  computeHmacSignature,
  computeIdempotencyKey,
} from "@/lib/security/verify-hmac";
import {
  DEMO_DEVICE_ID,
  DEMO_WEBHOOK_SECRET,
} from "@/lib/auth/session";
import { POST as postIngest } from "@/app/api/v1/ingest/route";
import type { WalletProvider } from "@/lib/supabase/types";

const PERUVIAN_CUSTOMERS = [
  "Carlos Mendoza",
  "Valeria Paredes",
  "Jorge Luis Huamán",
  "María Elena Quispe",
  "Diego Alejandro Vargas",
  "Lucía Fernández",
  "Rosa Angélica Chávez",
  "Fernando Salazar",
];

const REALISTIC_AMOUNTS = [12.5, 18.0, 24.9, 35.0, 45.5, 62.0, 85.0, 120.0];

export async function POST(request: NextRequest) {
  let body: { wallet?: WalletProvider; amount?: number; senderName?: string } =
    {};
  try {
    body = await request.json();
  } catch {
    // Use random defaults if body is empty
  }

  const wallet: WalletProvider = body.wallet === "PLIN" ? "PLIN" : "YAPE";
  const amount =
    body.amount ??
    REALISTIC_AMOUNTS[Math.floor(Math.random() * REALISTIC_AMOUNTS.length)];
  const senderName =
    body.senderName ??
    PERUVIAN_CUSTOMERS[Math.floor(Math.random() * PERUVIAN_CUSTOMERS.length)];

  const securityCode =
    wallet === "YAPE"
      ? String(Math.floor(100 + Math.random() * 900))
      : null;

  const notifiedAt = new Date().toISOString();
  const formattedAmount = amount.toFixed(2);
  const rawNotification =
    wallet === "YAPE"
      ? `Confirmación de Pago. ${senderName} te envió un pago por S/ ${formattedAmount}. El código de seguridad es: ${securityCode}`
      : `${senderName} te ha plineado S/ ${formattedAmount}`;

  const idempotencyKey = computeIdempotencyKey(
    `${DEMO_DEVICE_ID}|${wallet}|${formattedAmount}|${senderName}|${securityCode ?? ""}|${notifiedAt}|${Math.random()}`
  );

  const ingestPayload = {
    idempotencyKey,
    wallet,
    amount,
    senderName,
    securityCode,
    rawNotification,
    notifiedAt,
  };

  const rawBody = JSON.stringify(ingestPayload);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = computeHmacSignature(
    DEMO_WEBHOOK_SECRET,
    timestamp,
    rawBody
  );

  const signedRequest = new NextRequest(new URL("/api/v1/ingest", request.url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Device-Id": DEMO_DEVICE_ID,
      "X-Timestamp": timestamp,
      "X-Signature": signature,
    },
    body: rawBody,
  });

  const response = await postIngest(signedRequest);
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
