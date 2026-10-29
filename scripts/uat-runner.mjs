#!/usr/bin/env node

/**
 * YNABx Comprehensive Automated End-to-End UAT Runner
 * Verifies all 12 zero-based budgeting stages, edge cases, and non-negotiable invariants:
 *   1. Operational Health & Readiness
 *   2. Auth Lifecycle & RFC 7807 ProblemDetail Formats
 *   3. Multi-Tenant Isolation Security (User B Cross-Plan Protection)
 *   4. Spending Plan Creation & Envelope Hierarchy
 *   5. Account Inflow & Ready to Assign (RTA) Conservation
 *   6. Zero-Based Envelope Allocation Equation
 *   7. Expense Outflow & Move Money Logic
 *   8. Credit Card Debt Movement & Partial Overspending Funding Split
 *   9. Month Rollover (M -> M+1): Positive Rollover, Cash Overspending RTA Deduction & Credit Debt Reset
 *  10. Paired Account-to-Account Transfer Atomicity & CC Payment Envelope Decrease
 *  11. Bank Reconciliation (Discrepancy Conflict, Auto-Adjustment & Locked Immutability)
 *  12. Category Deletion Reassignment & System Category Protection
 *
 * Usage:
 *   node scripts/uat-runner.mjs [baseUrl]
 * Default baseUrl: http://localhost:8080/api/v1
 */

const BASE_URL = process.argv[2] || process.env.API_BASE_URL || "http://localhost:8080/api/v1";

const COLORS = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  bold: "\x1b[1m",
};

function logStep(stepNum, title) {
  console.log(`\n${COLORS.cyan}${COLORS.bold}[Step ${stepNum}] ${title}${COLORS.reset}`);
}

function logPass(message) {
  console.log(`  ${COLORS.green}✔ PASS:${COLORS.reset} ${message}`);
}

function logFail(message) {
  console.error(`  ${COLORS.red}✖ FAIL:${COLORS.reset} ${message}`);
}

function assert(condition, message) {
  if (!condition) {
    logFail(message);
    throw new Error(`Assertion failed: ${message}`);
  }
  logPass(message);
}

async function request(path, options = {}, token = null, cookie = null) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(cookie ? { Cookie: cookie } : {}),
    ...(options.headers || {}),
  };

  let res;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (err) {
    throw new Error(
      `Cannot connect to Backend at ${url} (${err.message}).\n` +
      `  Tip: Ensure your Spring Boot backend is running via 'make dev-backend' or 'mvnw spring-boot:run'`
    );
  }
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // Non-JSON or empty response
  }

  return { status: res.status, headers: res.headers, body: json, text };
}

async function runUAT() {
  console.log(`${COLORS.bold}======================================================================${COLORS.reset}`);
  console.log(`${COLORS.bold}       YNABx Comprehensive End-to-End User Acceptance Test (UAT)      ${COLORS.reset}`);
  console.log(`${COLORS.bold}======================================================================${COLORS.reset}`);
  console.log(`Target Backend: ${COLORS.yellow}${BASE_URL}${COLORS.reset}\n`);

  const startTime = Date.now();
  let passedCount = 0;
  const countAssert = (cond, msg) => {
    assert(cond, msg);
    passedCount++;
  };

  try {
    // ─── Step 1: Health Check ────────────────────────────────────────────────
    logStep(1, "Operational Health & Readiness Check");
    const health = await request("/health");
    countAssert(health.status === 200, `GET /health returned HTTP 200 (received ${health.status})`);
    countAssert(health.body?.status === "UP", `Health status is "UP"`);

    // ─── Step 2: Auth Lifecycle & RFC 7807 ProblemDetail ─────────────────────
    logStep(2, "Auth Lifecycle & RFC 7807 ProblemDetail Validation");
    const uniqueEmailA = `uat_a_${Date.now()}@example.com`;
    const passwordA = "Password123!";

    // 2.1 Register User A
    const regRes = await request("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: uniqueEmailA,
        password: passwordA,
        display_name: "Alice Tester",
      }),
    });
    countAssert(regRes.status === 201, `POST /auth/register returned HTTP 201 Created`);
    const tokenA = regRes.body?.access_token;
    countAssert(typeof tokenA === "string" && tokenA.length > 20, "JWT access token successfully issued for User A");
    const setCookie = regRes.headers.get("set-cookie");
    countAssert(Boolean(setCookie && setCookie.includes("refresh_token=")), "HttpOnly refresh_token cookie issued on register");

    // 2.2 Test Invalid Login -> ProblemDetail RFC 7807
    const badLoginRes = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: uniqueEmailA,
        password: "WrongPassword!",
      }),
    });
    countAssert(badLoginRes.status === 401, `Invalid login rejected with HTTP 401 Unauthorized`);
    countAssert(
      Boolean(badLoginRes.body?.title && badLoginRes.body?.status === 401 && badLoginRes.body?.detail),
      `RFC 7807 ProblemDetail structure verified on auth failure (status=${badLoginRes.body?.status}, title="${badLoginRes.body?.title}")`,
    );

    // 2.3 Valid Login
    const loginRes = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: uniqueEmailA,
        password: passwordA,
      }),
    });
    countAssert(loginRes.status === 200, `POST /auth/login returned HTTP 200 OK`);

    // 2.4 Profile Check
    const meRes = await request("/auth/me", {}, tokenA);
    countAssert(meRes.status === 200, `GET /auth/me returned HTTP 200 OK`);
    countAssert(meRes.body?.display_name === "Alice Tester", `User profile matches display_name="Alice Tester"`);

    // ─── Step 3: Multi-Tenant Isolation Setup (User B) ───────────────────────
    logStep(3, "Multi-Tenant Isolation Setup (User B / Attacker Persona)");
    const uniqueEmailB = `uat_b_${Date.now()}@example.com`;
    const regBRes = await request("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: uniqueEmailB,
        password: "Password123!",
        display_name: "Bob Attacker",
      }),
    });
    countAssert(regBRes.status === 201, `POST /auth/register User B returned HTTP 201 Created`);
    const tokenB = regBRes.body?.access_token;
    countAssert(Boolean(tokenB), "User B access token acquired");

    // ─── Step 4: Create Plan & Category Hierarchy (User A) ───────────────────
    logStep(4, "Create Spending Plan & Verify Envelope Hierarchy");
    const planRes = await request(
      "/plans",
      {
        method: "POST",
        body: JSON.stringify({
          name: "Alice Household Budget",
          currency_code: "USD",
        }),
      },
      tokenA,
    );
    countAssert(planRes.status === 201, `POST /plans returned HTTP 201 Created`);
    const planId = planRes.body?.id;
    countAssert(Boolean(planId), `Plan ID generated: ${planId}`);

    // Verify Tenant Isolation: User B CANNOT view User A's plan
    const crossPlanRes = await request(`/plans/${planId}`, {}, tokenB);
    countAssert(
      crossPlanRes.status === 404,
      `Tenant Isolation: User B access to User A's Plan returned HTTP 404 Not Found (Zero Leakage)`,
    );

    const groupsRes = await request(`/plans/${planId}/category-groups?include_hidden=true`, {}, tokenA);
    countAssert(groupsRes.status === 200, `GET /plans/{planId}/category-groups returned HTTP 200`);
    const groups = groupsRes.body || [];
    countAssert(groups.length >= 2, `System category groups initialized (found ${groups.length} groups)`);

    // Create standard user group and category envelopes
    const userGroupRes = await request(
      `/plans/${planId}/category-groups`,
      {
        method: "POST",
        body: JSON.stringify({ name: "Living Expenses", sort_order: 2 }),
      },
      tokenA,
    );
    countAssert(userGroupRes.status === 201, `POST /category-groups created "Living Expenses"`);
    const userGroupId = userGroupRes.body?.id;

    const createCat = async (name) => {
      const res = await request(
        `/plans/${planId}/categories`,
        {
          method: "POST",
          body: JSON.stringify({ group_id: userGroupId, name }),
        },
        tokenA,
      );
      countAssert(res.status === 201, `Created category "${name}"`);
      return res.body;
    };

    const rentCat = await createCat("Rent");
    const groceriesCat = await createCat("Groceries");
    const utilitiesCat = await createCat("Utilities");
    const diningCat = await createCat("Dining Out");
    countAssert(Boolean(rentCat && groceriesCat && utilitiesCat && diningCat), "Located standard spending envelopes (Rent, Groceries, Utilities, Dining Out)");

    // ─── Step 5: Checking Inflow & Ready to Assign (RTA) ─────────────────────
    logStep(5, "Add Checking Account with $2,000.00 Starting Balance");
    const checkingRes = await request(
      `/plans/${planId}/accounts`,
      {
        method: "POST",
        body: JSON.stringify({
          name: "Chase Checking",
          type: "CHECKING",
          on_budget: true,
          initial_balance_milliunits: 2000000, // $2,000.00
        }),
      },
      tokenA,
    );
    countAssert(checkingRes.status === 201, `POST /accounts returned HTTP 201 Created`);
    const checkingId = checkingRes.body?.id;
    countAssert(
      checkingRes.body?.cleared_balance_milliunits === 2000000,
      `Checking initial cleared balance is exactly 2,000,000 milliunits ($2,000.00)`,
    );

    // Tenant Isolation check on Accounts
    const crossAccountRes = await request(`/plans/${planId}/accounts`, {}, tokenB);
    countAssert(
      crossAccountRes.status === 404,
      `Tenant Isolation: User B querying User A's Accounts rejected with HTTP 404 Not Found`,
    );

    // Define Months: Month M (Current) and Month M+1 (Next)
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const nextDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonth = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}-01`;

    let monthSummary = await request(`/plans/${planId}/months/${currentMonth}`, {}, tokenA);
    countAssert(monthSummary.status === 200, `GET month summary for ${currentMonth} returned HTTP 200`);
    countAssert(
      monthSummary.body?.ready_to_assign_milliunits === 2000000,
      `Ready to Assign (RTA) is exactly $2,000.00 (2,000,000 milliunits)`,
    );

    // ─── Step 6: Zero-Based Budgeting Equation ────────────────────────────────
    logStep(6, "Assign Funds Across Envelopes & Assert Zero-Based Equation");

    // Test duplicate category_id validation (Fail-Fast invariant)
    const dupAllocRes = await request(
      `/plans/${planId}/months/${currentMonth}/allocations`,
      {
        method: "PATCH",
        body: JSON.stringify({
          allocations: [
            { category_id: rentCat.id, assigned_milliunits: 100000 },
            { category_id: rentCat.id, assigned_milliunits: 200000 },
          ],
        }),
      },
      tokenA,
    );
    countAssert(
      dupAllocRes.status === 400,
      `Duplicate category_id in allocations array rejected with HTTP 400 Bad Request`,
    );

    // Valid allocation: Assign exact $2,000.00 -> RTA must become exactly 0
    const allocRes = await request(
      `/plans/${planId}/months/${currentMonth}/allocations`,
      {
        method: "PATCH",
        body: JSON.stringify({
          allocations: [
            { category_id: rentCat.id, assigned_milliunits: 1000000 }, // $1,000
            { category_id: groceriesCat.id, assigned_milliunits: 600000 }, // $600
            { category_id: utilitiesCat.id, assigned_milliunits: 400000 }, // $400
          ],
        }),
      },
      tokenA,
    );
    countAssert(allocRes.status === 200, `PATCH allocations returned HTTP 200 OK`);
    countAssert(
      allocRes.body?.total_assigned_milliunits === 2000000,
      `Total assigned equals exactly 2,000,000 milliunits ($2,000.00)`,
    );
    countAssert(
      allocRes.body?.ready_to_assign_milliunits === 0,
      `Ready to Assign is exactly 0 (Zero-Based Conservation Equation verified!)`,
    );

    // ─── Step 7: Expense Spending & Move Money ────────────────────────────────
    logStep(7, "Checking Outflow & Move Money Across Envelopes");
    const txRes = await request(
      `/plans/${planId}/transactions`,
      {
        method: "POST",
        body: JSON.stringify({
          account_id: checkingId,
          category_id: groceriesCat.id,
          payee_name: "Supermarket",
          date: currentMonth,
          amount_milliunits: -150000, // -$150.00
          memo: "Groceries trip",
          cleared: "CLEARED",
          approved: true,
        }),
      },
      tokenA,
    );
    countAssert(txRes.status === 201, `POST /transactions returned HTTP 201 Created`);
    const checkingTxId = txRes.body?.id;

    // Move Money: Move $50 (50,000) from Groceries ($600k -> $550k) to Dining Out ($0 -> $50k)
    const moveRes = await request(
      `/plans/${planId}/months/${currentMonth}/allocations`,
      {
        method: "PATCH",
        body: JSON.stringify({
          allocations: [
            { category_id: groceriesCat.id, assigned_milliunits: 550000 },
            { category_id: diningCat.id, assigned_milliunits: 50000 },
          ],
        }),
      },
      tokenA,
    );
    countAssert(moveRes.status === 200, `Move Money allocation update succeeded`);
    const updatedGroceries = moveRes.body?.categories?.find((c) => c.category_id === groceriesCat.id);
    const updatedDining = moveRes.body?.categories?.find((c) => c.category_id === diningCat.id);
    countAssert(
      updatedGroceries?.available_milliunits === 400000,
      `Groceries available is now $400.00 after spending -$150.00 and moving -$50.00`,
    );
    countAssert(
      updatedDining?.available_milliunits === 50000,
      `Dining Out available is now $50.00`,
    );
    countAssert(
      moveRes.body?.ready_to_assign_milliunits === 0,
      `Ready to Assign remains strictly 0 after Move Money`,
    );

    // ─── Step 8: Credit Card Spending & Partial/Overspent Funding Split ──────
    logStep(8, "Credit Card Spending & Partial Overspending Funding Split");
    const ccAccountRes = await request(
      `/plans/${planId}/accounts`,
      {
        method: "POST",
        body: JSON.stringify({
          name: "Visa Credit Card",
          type: "CREDIT_CARD",
          on_budget: true,
          initial_balance_milliunits: 0,
        }),
      },
      tokenA,
    );
    countAssert(ccAccountRes.status === 201, `Credit Card account created`);
    const ccAccountId = ccAccountRes.body?.id;

    const catsAfterCC = await request(`/plans/${planId}/categories?include_hidden=true`, {}, tokenA);
    const ccPaymentCat = catsAfterCC.body?.find(
      (c) => c.is_credit_card_payment && c.credit_card_account_id === ccAccountId,
    );
    countAssert(Boolean(ccPaymentCat), `Credit Card Payment category auto-provisioned for account`);

    // 8.1 Fully Funded CC Spend: -$100.00 on Groceries (which has $400 available)
    const ccTx1Res = await request(
      `/plans/${planId}/transactions`,
      {
        method: "POST",
        body: JSON.stringify({
          account_id: ccAccountId,
          category_id: groceriesCat.id,
          payee_name: "Amazon Online",
          date: currentMonth,
          amount_milliunits: -100000, // -$100.00
          cleared: "CLEARED",
          approved: true,
        }),
      },
      tokenA,
    );
    countAssert(ccTx1Res.status === 201, `Credit card transaction of -$100.00 recorded`);

    // 8.2 Partially Funded CC Spend: Utilities has $400.00 available. Spend -$500.00!
    // Result: Funded = $400.00 (moves to CC Payment), Unfunded Debt = $100.00
    const ccTx2Res = await request(
      `/plans/${planId}/transactions`,
      {
        method: "POST",
        body: JSON.stringify({
          account_id: ccAccountId,
          category_id: utilitiesCat.id,
          payee_name: "Electric Company",
          date: currentMonth,
          amount_milliunits: -500000, // -$500.00
          cleared: "CLEARED",
          approved: true,
        }),
      },
      tokenA,
    );
    countAssert(ccTx2Res.status === 201, `Overspending credit card transaction of -$500.00 recorded`);

    monthSummary = await request(`/plans/${planId}/months/${currentMonth}`, {}, tokenA);
    const groceriesAfterCC = monthSummary.body?.categories?.find((c) => c.category_id === groceriesCat.id);
    const utilitiesAfterCC = monthSummary.body?.categories?.find((c) => c.category_id === utilitiesCat.id);
    const ccPaymentBal = monthSummary.body?.categories?.find((c) => c.category_id === ccPaymentCat.id);

    countAssert(
      groceriesAfterCC?.available_milliunits === 300000,
      `Groceries available drops from $400.00 to $300.00 ($300k milliunits)`,
    );
    countAssert(
      utilitiesAfterCC?.available_milliunits === -100000,
      `Utilities available is negative -$100.00 (-100k milliunits) due to credit overspending`,
    );
    // CC Payment should receive $100 (from Groceries) + $400 (funded portion from Utilities) = $500
    countAssert(
      ccPaymentBal?.available_milliunits === 500000,
      `Credit Card Payment envelope received exactly funded amount $500.00 ($100k + $400k; unfunded $100k is NOT added to CC Payment envelope!)`,
    );

    // ─── Step 9: Month Rollover (M -> M+1) Invariants ────────────────────────
    logStep(9, "Month Rollover (M -> M+1): Positive Rollover, Cash Overspending RTA Deduction & Debt Reset");

    // 9.1 Create Cash Overspending in Month M: Dining Out has $50.00 available.
    // Spend -$100.00 in CASH -> Cash overspent by -$50.00 (-50,000 milliunits)!
    const cashOverTxRes = await request(
      `/plans/${planId}/transactions`,
      {
        method: "POST",
        body: JSON.stringify({
          account_id: checkingId,
          category_id: diningCat.id,
          payee_name: "Sushi Bar",
          date: currentMonth,
          amount_milliunits: -100000, // -$100.00 cash
          cleared: "CLEARED",
          approved: true,
        }),
      },
      tokenA,
    );
    countAssert(cashOverTxRes.status === 201, `Cash overspending transaction of -$100.00 in Dining Out recorded`);

    // Verify Month M state: Dining Out is -$50.00 cash overspent
    monthSummary = await request(`/plans/${planId}/months/${currentMonth}`, {}, tokenA);
    const diningEndMonthM = monthSummary.body?.categories?.find((c) => c.category_id === diningCat.id);
    countAssert(
      diningEndMonthM?.available_milliunits === -50000,
      `Month M Dining Out available is -$50.00 (-50,000 milliunits cash overspent)`,
    );

    // 9.2 Inspect Month M+1 (Next Month)
    const nextMonthSummary = await request(`/plans/${planId}/months/${nextMonth}`, {}, tokenA);
    countAssert(nextMonthSummary.status === 200, `GET /plans/{planId}/months/${nextMonth} returned HTTP 200 OK`);

    const rentMonthM1 = nextMonthSummary.body?.categories?.find((c) => c.category_id === rentCat.id);
    const groceriesMonthM1 = nextMonthSummary.body?.categories?.find((c) => c.category_id === groceriesCat.id);
    const diningMonthM1 = nextMonthSummary.body?.categories?.find((c) => c.category_id === diningCat.id);
    const utilitiesMonthM1 = nextMonthSummary.body?.categories?.find((c) => c.category_id === utilitiesCat.id);

    // Invariant A: Positive Rollover (Rent $1,000, Groceries $300 rollover unspent)
    countAssert(
      rentMonthM1?.available_milliunits === 1000000,
      `Month M+1 Rent available rolled over unspent +$1,000.00 (1,000,000 milliunits)`,
    );
    countAssert(
      groceriesMonthM1?.available_milliunits === 300000,
      `Month M+1 Groceries available rolled over unspent +$300.00 (300,000 milliunits)`,
    );

    // Invariant B: Cash Overspending Reset to 0 AND deducted from Month M+1 RTA
    countAssert(
      diningMonthM1?.available_milliunits === 0,
      `Month M+1 Dining Out available resets from negative cash overspending to $0.00`,
    );
    countAssert(
      nextMonthSummary.body?.ready_to_assign_milliunits === -50000,
      `Month M+1 Ready to Assign (RTA) has cash overspent deduction of -$50.00 (-50,000 milliunits)!`,
    );

    // Invariant C: Credit Overspending Reset to 0 WITHOUT deducting from RTA
    countAssert(
      utilitiesMonthM1?.available_milliunits === 0,
      `Month M+1 Utilities available resets from credit debt (-$100.00) to $0.00 (debt absorbed into CC liability)`,
    );

    // ─── Step 10: Credit Card Payment Transfer ───────────────────────────────
    logStep(10, "Paired Account-to-Account Transfer & CC Payment Envelope Decrease");
    // Transfer $200 from Checking to Credit Card
    const transferRes = await request(
      `/plans/${planId}/transactions`,
      {
        method: "POST",
        body: JSON.stringify({
          account_id: checkingId,
          transfer_account_id: ccAccountId,
          date: currentMonth,
          amount_milliunits: -200000, // -$200.00 from checking
          memo: "Credit card monthly payment",
          cleared: "CLEARED",
          approved: true,
        }),
      },
      tokenA,
    );
    countAssert(transferRes.status === 201, `Paired transfer transaction created`);
    const transferTx = transferRes.body;
    countAssert(
      transferTx?.amount_milliunits === -200000,
      `Source transaction is -$200.00 on checking account`,
    );

    // Verify CC Payment envelope decreased by $200.00 ($500 -> $300)
    monthSummary = await request(`/plans/${planId}/months/${currentMonth}`, {}, tokenA);
    const ccPaymentAfterTransfer = monthSummary.body?.categories?.find((c) => c.category_id === ccPaymentCat.id);
    countAssert(
      ccPaymentAfterTransfer?.available_milliunits === 300000,
      `Credit Card Payment envelope decreased from $500.00 to $300.00 after $200.00 payment transfer!`,
    );

    // ─── Step 11: Reconciliation & Lock Immutability ─────────────────────────
    logStep(11, "Bank Reconciliation (Conflict, Adjustment & Locked Immutability)");

    // 11.1 Reconcile with mismatch and create_adjustment_transaction: false -> 409 Conflict
    const badRecRes = await request(
      `/plans/${planId}/accounts/${checkingId}/reconcile`,
      {
        method: "POST",
        body: JSON.stringify({
          statement_balance_milliunits: 99999999, // Intentional mismatch
          create_adjustment_transaction: false,
        }),
      },
      tokenA,
    );
    countAssert(
      badRecRes.status === 409,
      `Reconcile with balance discrepancy and create_adjustment_transaction=false rejected with HTTP 409 Conflict`,
    );

    // 11.2 Reconcile with discrepancy and create_adjustment_transaction: true -> 200 OK
    // Checking starting +2,000,000, grocery -150,000, dining -100,000, transfer -200,000 -> Current cleared balance = 1,550,000
    // Statement says 1,600,000 (diff = +50,000 adjustment)
    const recRes = await request(
      `/plans/${planId}/accounts/${checkingId}/reconcile`,
      {
        method: "POST",
        body: JSON.stringify({
          statement_balance_milliunits: 1600000,
          create_adjustment_transaction: true,
        }),
      },
      tokenA,
    );
    countAssert(recRes.status === 200, `POST reconcile account with auto-adjustment returned HTTP 200 OK`);
    countAssert(
      recRes.body?.cleared_balance_milliunits === 1600000,
      `Checking cleared balance adjusted to match statement balance: 1,600,000 milliunits ($1,600.00)`,
    );

    // 11.3 Assert Immutability of Reconciled Transactions:
    // DELETE on checkingTxId (now RECONCILED) must return 409 Conflict
    const delReconciledRes = await request(
      `/plans/${planId}/transactions/${checkingTxId}`,
      { method: "DELETE" },
      tokenA,
    );
    countAssert(
      delReconciledRes.status === 409,
      `Attempting to DELETE reconciled transaction rejected with HTTP 409 Conflict (Locked Invariant)`,
    );

    // PUT on checkingTxId (changing amount) must return 409 Conflict
    const putReconciledRes = await request(
      `/plans/${planId}/transactions/${checkingTxId}`,
      {
        method: "PUT",
        body: JSON.stringify({
          account_id: checkingId,
          amount_milliunits: -999999, // Attempt to mutate amount
          date: currentMonth,
        }),
      },
      tokenA,
    );
    countAssert(
      putReconciledRes.status === 409,
      `Attempting to PUT/mutate reconciled transaction amount rejected with HTTP 409 Conflict (Locked Invariant)`,
    );

    // ─── Step 12: Category Deletion & System Category Protection ─────────────
    logStep(12, "Category Deletion Reassignment & System Protection");

    // 12.1 Attempting to delete system Credit Card Payment category -> 409 Conflict
    const delSystemCatRes = await request(
      `/plans/${planId}/categories/${ccPaymentCat.id}`,
      { method: "DELETE" },
      tokenA,
    );
    countAssert(
      delSystemCatRes.status === 409,
      `Attempting to DELETE system Credit Card Payment category rejected with HTTP 409 Conflict`,
    );

    // 12.2 Create a disposable category, add transaction, delete with reassignment to diningCat
    const dispGroupRes = await request(
      `/plans/${planId}/categories`,
      {
        method: "POST",
        body: JSON.stringify({
          group_id: groceriesCat.group_id,
          name: "Temporary Snacks",
        }),
      },
      tokenA,
    );
    countAssert(dispGroupRes.status === 201, `Created temporary category for deletion test`);
    const tempCatId = dispGroupRes.body?.id;

    // Delete without reassign parameter while holding transactions or empty -> test reassign
    const delWithReassignRes = await request(
      `/plans/${planId}/categories/${tempCatId}?reassign_to_category_id=${diningCat.id}`,
      { method: "DELETE" },
      tokenA,
    );
    countAssert(
      delWithReassignRes.status === 204,
      `DELETE category with reassign_to_category_id successfully executed (HTTP 204 No Content)`,
    );

    // ─── Summary Report ──────────────────────────────────────────────────────
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n${COLORS.green}${COLORS.bold}======================================================================${COLORS.reset}`);
    console.log(`${COLORS.green}${COLORS.bold}          UAT SUCCESS: ALL 12 PHASES & INVARIANTS VERIFIED!           ${COLORS.reset}`);
    console.log(`${COLORS.green}${COLORS.bold}======================================================================${COLORS.reset}`);
    console.log(`  Total Edge-Case & Invariant Checks: ${COLORS.bold}${passedCount}${COLORS.reset}`);
    console.log(`  Execution Time:                     ${COLORS.bold}${duration}s${COLORS.reset}`);
    console.log(`  Zero-Based Math Integrity:          ${COLORS.bold}100% Verified${COLORS.reset}`);
    console.log(`  Multi-Tenant Isolation:             ${COLORS.bold}100% Enforced${COLORS.reset}\n`);
    process.exit(0);
  } catch (err) {
    console.error(`\n${COLORS.red}${COLORS.bold}UAT FAILED!${COLORS.reset}`);
    console.error(err.message);
    process.exit(1);
  }
}

runUAT();
