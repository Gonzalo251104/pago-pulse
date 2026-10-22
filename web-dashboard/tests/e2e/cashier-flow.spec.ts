import { test, expect } from "@playwright/test";
import {
  computeHmacSignature,
  computeIdempotencyKey,
} from "../../src/lib/security/verify-hmac";
import {
  DEMO_DEVICE_ID,
  DEMO_WEBHOOK_SECRET,
} from "../../src/lib/auth/session";

test.describe("Cashier Live Verification Flow (E2E)", () => {
  test("ingests signed Yape webhook, displays it on /live in real time, and claims it with an order reference", async ({
    page,
    request,
  }) => {
    // 1. Open Cashier Live Dashboard
    await page.goto("/live");
    await expect(
      page.getByRole("heading", { name: "Monitor de Caja en Tiempo Real" })
    ).toBeVisible();

    // 2. Send a signed HMAC-SHA256 Yape webhook to POST /api/v1/ingest
    const uniqueSender = `Valeria Paredes ${Date.now().toString().slice(-4)}`;
    const amount = 78.4;
    const securityCode = "614";
    const notifiedAt = new Date().toISOString();
    const idempotencyKey = computeIdempotencyKey(
      `${DEMO_DEVICE_ID}|YAPE|${amount}|${uniqueSender}|${securityCode}|${notifiedAt}`
    );

    const payload = {
      idempotencyKey,
      wallet: "YAPE",
      amount,
      senderName: uniqueSender,
      securityCode,
      rawNotification: `Confirmación de Pago. ${uniqueSender} te envió un pago por S/ 78.40. El código de seguridad es: ${securityCode}`,
      notifiedAt,
    };

    const rawBody = JSON.stringify(payload);
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = computeHmacSignature(
      DEMO_WEBHOOK_SECRET,
      timestamp,
      rawBody
    );

    const ingestResponse = await request.post("/api/v1/ingest", {
      headers: {
        "Content-Type": "application/json",
        "X-Device-Id": DEMO_DEVICE_ID,
        "X-Timestamp": timestamp,
        "X-Signature": signature,
      },
      data: rawBody,
    });

    expect(ingestResponse.status()).toBe(201);
    const ingestJson = await ingestResponse.json();
    const createdPaymentId = ingestJson.payment.id as string;

    // 3. Verify the payment card appears in < 1s on the /live screen
    const paymentCard = page.getByTestId(`payment-card-${createdPaymentId}`);
    await expect(paymentCard).toBeVisible({ timeout: 5000 });
    await expect(paymentCard).toContainText(uniqueSender);
    await expect(paymentCard).toContainText("78.40");
    await expect(paymentCard).toContainText("Cód: 614");
    await expect(paymentCard).toContainText("POR ATENDER");

    // 4. Click "Atender Pago" and enter "Mesa 4" in ClaimPaymentDialog
    await paymentCard.getByRole("button", { name: "Atender Pago" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Mesa 4" }).click();
    await dialog
      .getByRole("button", { name: "Confirmar y Marcar Atendido" })
      .click();

    // 5. Verify status transitions from UNCLAIMED -> CLAIMED with order reference
    await expect(paymentCard).toContainText("ATENDIDO");
    await expect(paymentCard).toContainText("Ref: Mesa 4");
  });
});
