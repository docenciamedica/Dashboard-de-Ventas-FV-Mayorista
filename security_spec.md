# Security Specification for Firestore Database

## 1. Data Invariants
- **Week Documents Identification**: The week document ID in the `/weeks/{weekId}` collection must conform to the format `week-{number}-2026`.
- **Structural Integrity**: A week document must contain a `routes` array field of type List, and an `updatedAt` field.
- **Maximum Lengths**: Real/meta values must be positive numbers. Document IDs must have a length limit to prevent space exhaustion.

## 2. The "Dirty Dozen" Payloads (Aesthetic & structural security tests)
We define the following payloads to be rejected if attempting malicious insertion:
1. ID with excessive length (DoS attack)
2. Week document without any `id` field
3. Week document with a non-array `routes` field (type failure)
4. Route list elements containing missing properties (non-compliance to schema)
5. Routes with negative values for `divisas`
6. Insertion where `updatedAt` is not a valid date/timestamp or is future-spoofed
7. Injecting admin-escalation keys like `role` or `isAdmin` inside the week payload
8. Updating fields that are read-only
9. Bypassing client-side filters by list queries
10. Sibling document sync vulnerabilities
11. Malicious string values in IDs
12. Identity hijacking

## 3. The Test Runner and Rules Verification
Verification of rules with unit tests showing permission-denied for incorrect structures is documented here. Rules will require a valid authenticated user or simple read/write with strict structure matching.
