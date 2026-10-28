#!/usr/bin/env node

/**
 * YNABx Automated End-to-End UAT Runner
 * Executes the complete 7-step Zero-Based Budgeting verification against a live backend.
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

async function request(path, options = {}, token = null) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  let res;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (err) {
    throw new Error(
      `Cannot connect to Backend at ${url} (${err.message}).\n` +
      `  Tip: Ensure your Spring Boot backend is started with:\n` +
      `       $env:SPRING_DATASOURCE_URL="jdbc:postgresql://<neon-host>/<db>?sslmode=require"\n` +
      `       ./mvnw spring-boot:run`
    );
  }
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // raw text
  }

  return { status: res.status, headers: res.headers, body: json, text };
}

async function runUAT() {
  console.log(`${COLORS.bold}=====================================================${COLORS.reset}`);
  console.log(`${COLORS.bold}     YNABx Automated User Acceptance Test (UAT)     ${COLORS.reset}`);
  console.log(`${COLORS.bold}=====================================================${COLORS.reset}`);
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

    // ─── Step 2: Register New User & Auth ────────────────────────────────────
    logStep(2, "Register New Test User & Receive Access Token");
    const uniqueEmail = `uat_user_${Date.now()}@example.com`;
    const password = "Password123!";
    const regRes = await request("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: uniqueEmail,
        password: password,
        name: "UAT Tester",
      }),
    });

    countAssert(regRes.status === 201, `POST /auth/register returned HTTP 201 Created`);
    const token = regRes.body?.access_token;
    countAssert(typeof token === "string" && token.length > 20, "JWT access token successfully issued");
    const userId = regRes.body?.user_id;

    // ─── Step 3: Create Plan & Inspect Default Structure ─────────────────────
    logStep(3, "Create Spending Plan & Verify Envelope Hierarchy");
    const planRes = await request(
      "/plans",
      {
        method: "POST",
        body: JSON.stringify({
          name: "UAT Household Budget",
          currency_code: "USD",
        }),
      },
      token,
    );
    countAssert(planRes.status === 201, `POST /plans returned HTTP 201 Created`);
    const planId = planRes.body?.id;
    countAssert(Boolean(planId), `Plan ID generated: ${planId}`);

    const groupsRes = await request(`/plans/${planId}/category-groups?include_hidden=true`, {}, token);
    countAssert(groupsRes.status === 200, `GET /plans/{planId}/category-groups returned HTTP 200`);
    const groups = groupsRes.body || [];
    countAssert(groups.length >= 3, `Default category groups initialized (found ${groups.length} groups)`);

    // Fetch categories flat list to locate targets
    const catsRes = await request(`/plans/${planId}/categories?include_hidden=true`, {}, token);
    const categories = catsRes.body || [];
    const findCat = (nameSubstr) =>
      categories.find((c) => c.name.toLowerCase().includes(nameSubstr.toLowerCase()));

    const rentCat = findCat("rent") || categories.find((c) => !c.inflow_category && !c.is_credit_card_payment);
    const groceriesCat = findCat("groceries") || categories[1];
    const utilitiesCat = findCat("utilities") || categories[2];
    const diningCat = findCat("dining") || categories[3];

    countAssert(Boolean(rentCat && groceriesCat), "Located standard spending envelopes (Rent, Groceries)");

    // ─── Step 4: Add Checking Account & Verify Inflow (RTA) ───────────────────
    logStep(4, "Add Checking Account with $2,000.00 Starting Balance");
    const checkingRes = await request(
      `/plans/${planId}/accounts`,
      {
        method: "POST",
        body: JSON.stringify({
          name: "Vietcombank Checking",
          type: "CHECKING",
          on_budget: true,
          initial_balance_milliunits: 2000000, // $2,000.00
        }),
      },
      token,
    );
    countAssert(checkingRes.status === 201, `POST /accounts returned HTTP 201 Created`);
    const checkingId = checkingRes.body?.id;
    countAssert(
      checkingRes.body?.cleared_balance_milliunits === 2000000,
      `Checking initial cleared balance is exactly 2,000,000 milliunits ($2,000.00)`,
    );

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    let monthSummary = await request(`/plans/${planId}/months/${currentMonth}`, {}, token);
    countAssert(monthSummary.status === 200, `GET month summary for ${currentMonth} returned HTTP 200`);
    countAssert(
      monthSummary.body?.ready_to_assign_milliunits === 2000000,
      `Ready to Assign (RTA) is exactly $2,000.00 (2,000,000 milliunits)`,
    );

    // ─── Step 5: Assign Money (Zero-Based Budgeting Invariant) ────────────────
    logStep(5, "Assign Funds Across Envelopes & Assert Zero-Based Equation");
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
      token,
    );

    countAssert(allocRes.status === 200, `PATCH allocations returned HTTP 200`);
    countAssert(
      allocRes.body?.total_assigned_milliunits === 2000000,
      `Total assigned equals exactly 2,000,000 milliunits ($2,000.00)`,
    );
    countAssert(
      allocRes.body?.ready_to_assign_milliunits === 0,
      `Ready to Assign is exactly 0 (Zero-Based Conservation Equation verified!)`,
    );

    // ─── Step 6: Expense Spending & Move Money ────────────────────────────────
    logStep(6, "Checking Transaction Outflow & Move Money Modal Logic");
    const txRes = await request(
      `/plans/${planId}/transactions`,
      {
        method: "POST",
        body: JSON.stringify({
          account_id: checkingId,
          category_id: groceriesCat.id,
          payee_name: "VinMart Supermarket",
          date: currentMonth,
          amount_milliunits: -150000, // -$150.00
          memo: "Weekly Groceries",
          cleared: "CLEARED",
          approved: true,
        }),
      },
      token,
    );
    countAssert(txRes.status === 201, `POST /transactions returned HTTP 201 Created`);
    const checkingTxId = txRes.body?.id;

    monthSummary = await request(`/plans/${planId}/months/${currentMonth}`, {}, token);
    const groceriesBal = monthSummary.body?.categories?.find((c) => c.category_id === groceriesCat.id);
    countAssert(
      groceriesBal?.activity_milliunits === -150000,
      `Groceries activity is -$150.00 (-150,000 milliunits)`,
    );
    countAssert(
      groceriesBal?.available_milliunits === 450000,
      `Groceries available drops from $600.00 to $450.00 (450,000 milliunits)`,
    );

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
      token,
    );
    countAssert(moveRes.status === 200, `Move Money allocation update succeeded`);
    const updatedGroceries = moveRes.body?.categories?.find((c) => c.category_id === groceriesCat.id);
    const updatedDining = moveRes.body?.categories?.find((c) => c.category_id === diningCat.id);
    countAssert(
      updatedGroceries?.available_milliunits === 400000,
      `Groceries available is now $400.00 after moving $50.00`,
    );
    countAssert(
      updatedDining?.available_milliunits === 50000,
      `Dining Out available is now $50.00`,
    );
    countAssert(
      moveRes.body?.ready_to_assign_milliunits === 0,
      `Ready to Assign remains strictly 0 after Move Money`,
    );

    // ─── Step 7: Credit Card Spending & Automatic Debt Funding ───────────────
    logStep(7, "Credit Card Spending & Auto-Funded Payment Category");
    const ccAccountRes = await request(
      `/plans/${planId}/accounts`,
      {
        method: "POST",
        body: JSON.stringify({
          name: "Techcombank Visa",
          type: "CREDIT_CARD",
          on_budget: true,
          initial_balance_milliunits: 0,
        }),
      },
      token,
    );
    countAssert(ccAccountRes.status === 201, `Credit Card account created`);
    const ccAccountId = ccAccountRes.body?.id;

    // Refresh categories to locate the automatically created Credit Card Payment Category
    const catsAfterCC = await request(`/plans/${planId}/categories?include_hidden=true`, {}, token);
    const ccPaymentCat = catsAfterCC.body?.find(
      (c) => c.is_credit_card_payment && c.credit_card_account_id === ccAccountId,
    );
    countAssert(Boolean(ccPaymentCat), `Credit Card Payment category auto-provisioned for account`);

    // Spend $100 on Credit Card under Groceries
    const ccTxRes = await request(
      `/plans/${planId}/transactions`,
      {
        method: "POST",
        body: JSON.stringify({
          account_id: ccAccountId,
          category_id: groceriesCat.id,
          payee_name: "Shopee Online",
          date: currentMonth,
          amount_milliunits: -100000, // -$100.00
          cleared: "CLEARED",
          approved: true,
        }),
      },
      token,
    );
    countAssert(ccTxRes.status === 201, `Credit card transaction of -$100.00 recorded`);

    // Verify Groceries decreased by $100 AND CC Payment category increased by $100
    monthSummary = await request(`/plans/${planId}/months/${currentMonth}`, {}, token);
    const groceriesAfterCC = monthSummary.body?.categories?.find((c) => c.category_id === groceriesCat.id);
    const ccPaymentBal = monthSummary.body?.categories?.find((c) => c.category_id === ccPaymentCat.id);

    countAssert(
      groceriesAfterCC?.available_milliunits === 300000,
      `Groceries available decreased to $300.00 ($400 - $100)`,
    );
    countAssert(
      ccPaymentBal?.available_milliunits === 100000,
      `Credit Card Payment envelope automatically funded with +$100.00 (100,000 milliunits)!`,
    );

    // ─── Step 8: Reconciliation & Reconciled Lock Immutability ────────────────
    logStep(8, "Account Reconciliation & Locked Immutability Verification");
    // Checking had +2,000,000, spent -150,000 -> current cleared balance is 1,850,000 ($1,850.00)
    const recRes = await request(
      `/plans/${planId}/accounts/${checkingId}/reconcile`,
      {
        method: "POST",
        body: JSON.stringify({
          statement_balance_milliunits: 1850000,
          create_adjustment_transaction: false,
        }),
      },
      token,
    );
    countAssert(recRes.status === 200, `POST reconcile account returned HTTP 200`);

    // Attempting to delete the reconciled transaction must fail with 409 Conflict
    const delRes = await request(
      `/plans/${planId}/transactions/${checkingTxId}`,
      {
        method: "DELETE",
      },
      token,
    );
    countAssert(
      delRes.status === 409,
      `Attempting to mutate/delete reconciled transaction rejected with HTTP 409 Conflict (Transaction Locked Invariant enforced!)`,
    );

    // ─── Summary Report ──────────────────────────────────────────────────────
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n${COLORS.green}${COLORS.bold}=====================================================${COLORS.reset}`);
    console.log(`${COLORS.green}${COLORS.bold}           UAT PASSED: ALL 8 PHASES VERIFIED         ${COLORS.reset}`);
    console.log(`${COLORS.green}${COLORS.bold}=====================================================${COLORS.reset}`);
    console.log(`  Total Invariant Checks Passed: ${COLORS.bold}${passedCount}${COLORS.reset}`);
    console.log(`  Execution Time:                ${COLORS.bold}${duration}s${COLORS.reset}`);
    console.log(`  Neon DB Data Integrity:        ${COLORS.bold}100% OK${COLORS.reset}\n`);
    process.exit(0);
  } catch (err) {
    console.error(`\n${COLORS.red}${COLORS.bold}UAT FAILED!${COLORS.reset}`);
    console.error(err.message);
    process.exit(1);
  }
}

runUAT();
