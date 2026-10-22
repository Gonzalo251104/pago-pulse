# PagoPulse — Product Specification (`PRODUCT.md`)

## 1. Core Purpose
PagoPulse is a real-time point-of-sale (POS) payment verification and daily cash reconciliation system built for Peruvian merchants accepting **Yape** and **Plin**.

## 2. Target Audience & Environment
- **Primary Operator:** Cashiers and counter staff in busy Peruvian bodegas, restaurants, pharmacies, and retail stores.
- **Secondary Operator:** Business owners who pair their Android phone via QR code and reconcile daily shift totals.
- **Operating Conditions:** High-tempo checkout counters where a cashier must verify within **1 second** from 1–2 meters away whether a customer's payment is genuine—without ever touching the owner's bank account or trusting a customer's phone screenshot.

## 3. Core Jobs-to-be-Done
1. **Instant Visual + Auditory Verification:** Hear the Spanish voice readout (*"Yape recibido de Carlos Mendoza por 45 soles con 50 céntimos"*) and verify the 3-digit Yape security code at a glance.
2. **One-Tap Claiming ("Atender"):** Attach an optional table/receipt reference (`Mesa 4`, `Mostrador`) so the same payment cannot be used twice by two customers.
3. **Shift Cash Reconciliation ("Cuadre de Caja"):** Compare Yape vs. Plin subtotals at the end of the shift and export an Excel-ready UTF-8 CSV.
