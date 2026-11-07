import json

# Load existing
with open("ynab-ember-web/mock_budget.json", "r", encoding="utf-8") as f:
    budget_data = json.load(f)

entities = budget_data["changed_entities"]

# 1. Accounts
entities["be_accounts"] = [
    {
        "id": "acc_checking",
        "account_name": "Checking Account",
        "account_type": "checking",
        "note": "Primary Checking Account",
        "on_budget": True,
        "closed": False,
        "is_tombstone": False,
        "cleared_balance": 4500000,
        "uncleared_balance": 250000
    },
    {
        "id": "acc_savings",
        "account_name": "Emergency Savings",
        "account_type": "savings",
        "note": "High-yield Savings",
        "on_budget": True,
        "closed": False,
        "is_tombstone": False,
        "cleared_balance": 12000000,
        "uncleared_balance": 0
    },
    {
        "id": "acc_credit_visa",
        "account_name": "Visa Sapphire Card",
        "account_type": "creditCard",
        "note": "Rewards Card",
        "on_budget": True,
        "closed": False,
        "is_tombstone": False,
        "cleared_balance": -450000,
        "uncleared_balance": -120000
    },
    {
        "id": "acc_tracking_house",
        "account_name": "Home Mortgage",
        "account_type": "otherLiability",
        "note": "30-year Fixed",
        "on_budget": False,
        "closed": False,
        "is_tombstone": False,
        "cleared_balance": -250000000,
        "uncleared_balance": 0
    }
]

entities["be_account_calculations"] = [
    {
        "id": f"calc_{acc['id']}",
        "account_id": acc["id"],
        "entities_account_id": acc["id"],
        "cleared_balance": acc["cleared_balance"],
        "uncleared_balance": acc["uncleared_balance"],
        "info_count": 0,
        "warning_count": 0,
        "is_tombstone": False
    } for acc in entities["be_accounts"]
]

# 2. Master Categories & Subcategories
entities["be_master_categories"] = [
    {
        "id": "mc_internal",
        "name": "Internal Master Category",
        "internal_name": "Internal",
        "is_tombstone": False
    },
    {
        "id": "mc_credit_payments",
        "name": "Credit Card Payments",
        "internal_name": None,
        "is_tombstone": False
    },
    {
        "id": "mc_bills",
        "name": "Immediate Obligations",
        "internal_name": None,
        "is_tombstone": False
    },
    {
        "id": "mc_frequent",
        "name": "True Expenses & Living",
        "internal_name": None,
        "is_tombstone": False
    },
    {
        "id": "mc_goals",
        "name": "Quality of Life Goals",
        "internal_name": None,
        "is_tombstone": False
    }
]

entities["be_subcategories"] = [
    {
        "id": "cat_rta",
        "master_category_id": "mc_internal",
        "entities_master_category_id": "mc_internal",
        "name": "Inflow: Ready to Assign",
        "internal_name": "Inflow",
        "is_tombstone": False
    },
    {
        "id": "cat_cc_visa",
        "master_category_id": "mc_credit_payments",
        "entities_master_category_id": "mc_credit_payments",
        "name": "Visa Sapphire Card",
        "internal_name": None,
        "is_tombstone": False
    },
    {
        "id": "cat_rent",
        "master_category_id": "mc_bills",
        "entities_master_category_id": "mc_bills",
        "name": "Rent / Mortgage",
        "internal_name": None,
        "is_tombstone": False
    },
    {
        "id": "cat_electric",
        "master_category_id": "mc_bills",
        "entities_master_category_id": "mc_bills",
        "name": "Electric & Water",
        "internal_name": None,
        "is_tombstone": False
    },
    {
        "id": "cat_internet",
        "master_category_id": "mc_bills",
        "entities_master_category_id": "mc_bills",
        "name": "Internet Service",
        "internal_name": None,
        "is_tombstone": False
    },
    {
        "id": "cat_groceries",
        "master_category_id": "mc_frequent",
        "entities_master_category_id": "mc_frequent",
        "name": "Groceries",
        "internal_name": None,
        "is_tombstone": False
    },
    {
        "id": "cat_dining",
        "master_category_id": "mc_frequent",
        "entities_master_category_id": "mc_frequent",
        "name": "Dining Out",
        "internal_name": None,
        "is_tombstone": False
    },
    {
        "id": "cat_transport",
        "master_category_id": "mc_frequent",
        "entities_master_category_id": "mc_frequent",
        "name": "Gas & Public Transit",
        "internal_name": None,
        "is_tombstone": False
    },
    {
        "id": "cat_emergency",
        "master_category_id": "mc_goals",
        "entities_master_category_id": "mc_goals",
        "name": "Emergency Fund",
        "internal_name": None,
        "is_tombstone": False
    },
    {
        "id": "cat_vacation",
        "master_category_id": "mc_goals",
        "entities_master_category_id": "mc_goals",
        "name": "Summer Vacation",
        "internal_name": None,
        "is_tombstone": False
    }
]

# 3. Monthly Subcategory Budgets and Calculations for 2026-10-01
current_month = "2026-10-01"
entities["be_monthly_budgets"] = [
    {
        "id": "mb_202610",
        "month": current_month,
        "is_tombstone": False
    }
]

entities["be_monthly_budget_calculations"] = [
    {
        "id": "mbc_202610",
        "monthly_budget_id": "mb_202610",
        "cash_outflows": -1850000,
        "immediate_income": 5000000,
        "uncategorized_cash_outflows": 0,
        "is_tombstone": False
    }
]

# Provide varied financial states:
# cat_rent: exactly funded (Available 1,200.00)
# cat_electric: cash overspent (Activity -150.00, Assigned 100.00 -> Available -50.00 RED)
# cat_dining: credit overspent (Activity -220.00, Assigned 150.00 -> Available -70.00 YELLOW/CREDIT)
# cat_groceries: funded with target (Assigned 400.00, Activity -250.00 -> Available 150.00)
# cat_emergency: underfunded goal
subcat_budgets = [
    {"subcat_id": "cat_rent", "budgeted": 1200000, "spent": -1200000, "balance": 0},
    {"subcat_id": "cat_electric", "budgeted": 100000, "spent": -150000, "balance": -50000},
    {"subcat_id": "cat_internet", "budgeted": 60000, "spent": -60000, "balance": 0},
    {"subcat_id": "cat_groceries", "budgeted": 450000, "spent": -280000, "balance": 170000},
    {"subcat_id": "cat_dining", "budgeted": 150000, "spent": -220000, "balance": -70000},
    {"subcat_id": "cat_transport", "budgeted": 80000, "spent": -35000, "balance": 45000},
    {"subcat_id": "cat_emergency", "budgeted": 200000, "spent": 0, "balance": 200000},
    {"subcat_id": "cat_vacation", "budgeted": 100000, "spent": 0, "balance": 100000},
    {"subcat_id": "cat_cc_visa", "budgeted": 0, "spent": 0, "balance": 450000}
]

entities["be_monthly_subcategory_budgets"] = [
    {
        "id": f"msb_202610_{b['subcat_id']}",
        "monthly_budget_id": "mb_202610",
        "subcategory_id": b["subcat_id"],
        "budgeted": b["budgeted"],
        "note": "",
        "is_tombstone": False
    } for b in subcat_budgets
]

entities["be_monthly_subcategory_budget_calculations"] = [
    {
        "id": f"msbc_202610_{b['subcat_id']}",
        "monthly_subcategory_budget_id": f"msb_202610_{b['subcat_id']}",
        "all_spending": b["spent"],
        "balance": b["balance"],
        "budgeted": b["budgeted"],
        "cash_outflows": b["spent"],
        "credit_outflows": 0,
        "is_tombstone": False
    } for b in subcat_budgets
]

# 4. Realistic Transactions
entities["be_payees"] = [
    {"id": "p_employer", "name": "Acme Tech Payroll", "internal_name": None, "is_tombstone": False},
    {"id": "p_landlord", "name": "City View Apartments", "internal_name": None, "is_tombstone": False},
    {"id": "p_trader_joes", "name": "Trader Joe's", "internal_name": None, "is_tombstone": False},
    {"id": "p_power_co", "name": "Metropolitan Electric", "internal_name": None, "is_tombstone": False},
    {"id": "p_sushi", "name": "Sakura Japanese Cuisine", "internal_name": None, "is_tombstone": False},
    {"id": "p_transfer_visa", "name": "Transfer : Visa Sapphire Card", "internal_name": None, "is_tombstone": False}
]

entities["be_transactions"] = [
    {
        "id": "tx_salary",
        "account_id": "acc_checking",
        "date": "2026-10-01",
        "amount": 5000000,
        "memo": "October Salary",
        "cleared": "Cleared",
        "accepted": True,
        "entities_payee_id": "p_employer",
        "entities_subcategory_id": "cat_rta",
        "is_tombstone": False
    },
    {
        "id": "tx_rent",
        "account_id": "acc_checking",
        "date": "2026-10-02",
        "amount": -1200000,
        "memo": "Monthly Rent",
        "cleared": "Cleared",
        "accepted": True,
        "entities_payee_id": "p_landlord",
        "entities_subcategory_id": "cat_rent",
        "is_tombstone": False
    },
    {
        "id": "tx_electric",
        "account_id": "acc_checking",
        "date": "2026-10-05",
        "amount": -150000,
        "memo": "High utility summer bill",
        "cleared": "Uncleared",
        "accepted": True,
        "entities_payee_id": "p_power_co",
        "entities_subcategory_id": "cat_electric",
        "is_tombstone": False
    },
    {
        "id": "tx_groceries_1",
        "account_id": "acc_credit_visa",
        "date": "2026-10-07",
        "amount": -180000,
        "memo": "Weekly haul",
        "cleared": "Cleared",
        "accepted": True,
        "entities_payee_id": "p_trader_joes",
        "entities_subcategory_id": "cat_groceries",
        "is_tombstone": False
    },
    {
        "id": "tx_dining_1",
        "account_id": "acc_credit_visa",
        "date": "2026-10-12",
        "amount": -220000,
        "memo": "Dinner with friends",
        "cleared": "Uncleared",
        "accepted": True,
        "entities_payee_id": "p_sushi",
        "entities_subcategory_id": "cat_dining",
        "is_tombstone": False
    }
]

with open("ynab-ember-web/mock_budget.json", "w", encoding="utf-8") as f:
    json.dump(budget_data, f, indent=2)

# Copy to clone
with open("clone/src/state/initial_mock_data.json", "w", encoding="utf-8") as f:
    json.dump(budget_data, f, indent=2)

print("Updated mock_budget.json and initial_mock_data.json with full parity data!")
