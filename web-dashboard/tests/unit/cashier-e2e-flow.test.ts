import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import {
  computeHmacSignature,
  computeIdempotencyKey,
} from "@/lib/security/verify-hmac";
import {
  DEMO_DEVICE_ID,
  DEMO_WEBHOOK_SECRET,
} from "@/lib/auth/session";
import { POST as postIngest } from "@/app/api/v1/ingest/route";
import { PATCH as patchClaim } from "@/app/api/v1/payments/[id]/claim/route";
import { readLocalStore } from "@/lib/supabase/local-store";

describe("Full Cashier Flow Integration (Ingest -> Local Store -> Claim)", () => {
  it("ingests a signed payment, deduplicates retries, and transitions status to CLAIMED", async () => {
    const senderName = `Cliente Integración ${Date.now()}`;
    const notifiedAt = new Date().toISOString();
    const idempotencyKey = computeIdempotencyKey(
      `integration|${senderName}|${notifiedAt}`
    );

    const payload = {
      idempotencyKey,
      wallet: "YAPE" as const,
      amount: 55.9,
      senderName,
      securityCode: "903",
      rawNotification: `Confirmación de Pago. ${senderName} te envió un pago por S/ 55.90. El código de seguridad es: 903`,
      notifiedAt,
    };

    const rawBody = JSON.stringify(payload);
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = computeHmacSignature(
      DEMO_WEBHOOK_SECRET,
      timestamp,
      rawBody
    );

    // 1. Ingest new payment -> 201 Created
    const ingestReq = new NextRequest("http://localhost:3000/api/v1/ingest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Device-Id": DEMO_DEVICE_ID,
        "X-Timestamp": timestamp,
        "X-Signature": signature,
      },
      body: rawBody,
    });

    const ingestRes = await postIngest(ingestReq);
    expect(ingestRes.status).toBe(201);
    const ingestJson = await ingestRes.json();
    const paymentId = ingestJson.payment.id as string;
    expect(paymentId).toBeTruthy();

    // 2. Re-send identical payload -> 200 OK (idempotent duplicate)
    const retryReq = new NextRequest("http://localhost:3000/api/v1/ingest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Device-Id": DEMO_DEVICE_ID,
        "X-Timestamp": timestamp,
        "X-Signature": signature,
      },
      body: rawBody,
    });
    const retryRes = await postIngest(retryReq);
    expect(retryRes.status).toBe(200);
    const retryJson = await retryRes.json();
    expect(retryJson.status).toBe("duplicate");

    // 3. Claim the payment -> 200 OK with status = CLAIMED & order_reference = "Mesa 7"
    const claimReq = new NextRequest(
      `http://localhost:3000/api/v1/payments/${paymentId}/claim`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderReference: "Mesa 7", status: "CLAIMED" }),
      }
    );

    const claimRes = await patchClaim(claimReq, {
      params: Promise.resolve({ id: paymentId }),
    });
    expect(claimRes.status).toBe(200);
    const claimJson = await claimRes.json();
    expect(claimJson.payment.status).toBe("CLAIMED");
    expect(claimJson.payment.order_reference).toBe("Mesa 7");

    // 4. Verify persisted state in store
    const persisted = readLocalStore().payments.find((p) => p.id === paymentId);
    expect(persisted?.status).toBe("CLAIMED");
    expect(persisted?.order_reference).toBe("Mesa 7");
  });
});
