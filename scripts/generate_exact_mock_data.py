import json

# Real categories in Ember
data = {
  "changed_entities": {
    "first_month": "2026-09-01",
    "last_month": "2026-12-01",
    "be_accounts": [
      {
        "id": "acc_chase",
        "account_name": "Chase Checking",
        "account_type": "checking",
        "note": "Primary Checking",
        "on_budget": True,
        "closed": False,
        "is_tombstone": False,
        "cleared_balance": 0,
        "uncleared_balance": 0
      },
      {
        "id": "acc_ally",
        "account_name": "Ally Savings",
        "account_type": "savings",
        "note": "Savings",
        "on_budget": True,
        "closed": False,
        "is_tombstone": False,
        "cleared_balance": 0,
        "uncleared_balance": 0
      },
      {
        "id": "acc_wallet",
        "account_name": "Wallet Cash",
        "account_type": "cash",
        "note": "Physical Cash",
        "on_budget": True,
        "closed": False,
        "is_tombstone": False,
        "cleared_balance": 0,
        "uncleared_balance": 0
      },
      {
        "id": "acc_vanguard",
        "account_name": "Vanguard Brokerage",
        "account_type": "otherAsset",
        "note": "Index funds",
        "on_budget": False,
        "closed": False,
        "is_tombstone": False,
        "cleared_balance": 0,
        "uncleared_balance": 0
      },
      {
        "id": "acc_car_loan",
        "account_name": "Car Loan",
        "account_type": "otherLiability",
        "note": "Auto financing",
        "on_budget": False,
        "closed": False,
        "is_tombstone": False,
        "cleared_balance": 0,
        "uncleared_balance": 0
      }
    ],
    "be_master_categories": [
      {"id": "mc_bills", "name": "Bills", "internal_name": None, "is_tombstone": False},
      {"id": "mc_needs", "name": "Needs", "internal_name": None, "is_tombstone": False},
      {"id": "mc_wants", "name": "Wants", "internal_name": None, "is_tombstone": False},
      {"id": "mc_savings", "name": "Savings Goals", "internal_name": None, "is_tombstone": False}
    ],
    "be_subcategories": [
      # Bills
      {"id": "sc_rent", "master_category_id": "mc_bills", "name": "Rent", "internal_name": None, "is_tombstone": False},
      {"id": "sc_electric", "master_category_id": "mc_bills", "name": "Electric", "internal_name": None, "is_tombstone": False},
      {"id": "sc_internet", "master_category_id": "mc_bills", "name": "Internet", "internal_name": None, "is_tombstone": False},
      {"id": "sc_phone", "master_category_id": "mc_bills", "name": "Phone", "internal_name": None, "is_tombstone": False},
      {"id": "sc_sub", "master_category_id": "mc_bills", "name": "Subscriptions", "internal_name": None, "is_tombstone": False},
      {"id": "sc_insurance", "master_category_id": "mc_bills", "name": "Car Insurance", "internal_name": None, "is_tombstone": False},
      # Needs
      {"id": "sc_groceries", "master_category_id": "mc_needs", "name": "Groceries", "internal_name": None, "is_tombstone": False},
      {"id": "sc_gas", "master_category_id": "mc_needs", "name": "Gas", "internal_name": None, "is_tombstone": False},
      {"id": "sc_pharmacy", "master_category_id": "mc_needs", "name": "Health & Pharmacy", "internal_name": None, "is_tombstone": False},
      {"id": "sc_household", "master_category_id": "mc_needs", "name": "Household", "internal_name": None, "is_tombstone": False},
      {"id": "sc_car_payment", "master_category_id": "mc_needs", "name": "Car Payment", "internal_name": None, "is_tombstone": False},
      # Wants
      {"id": "sc_dining", "master_category_id": "mc_wants", "name": "Dining Out", "internal_name": None, "is_tombstone": False},
      {"id": "sc_entertainment", "master_category_id": "mc_wants", "name": "Entertainment", "internal_name": None, "is_tombstone": False},
      {"id": "sc_shopping", "master_category_id": "mc_wants", "name": "Shopping", "internal_name": None, "is_tombstone": False},
      {"id": "sc_hobbies", "master_category_id": "mc_wants", "name": "Hobbies", "internal_name": None, "is_tombstone": False},
      # Savings Goals
      {"id": "sc_vacation", "master_category_id": "mc_savings", "name": "Vacation Fund", "internal_name": None, "is_tombstone": False},
      {"id": "sc_gifts", "master_category_id": "mc_savings", "name": "Christmas Gifts", "internal_name": None, "is_tombstone": False},
      {"id": "sc_investing", "master_category_id": "mc_savings", "name": "Investing", "internal_name": None, "is_tombstone": False},
      {"id": "sc_emergency", "master_category_id": "mc_savings", "name": "Emergency Fund", "internal_name": None, "is_tombstone": False}
    ],
    "be_monthly_subcategory_budgets": [],
    "be_monthly_subcategory_budget_calculations": [],
    "be_transactions": [],
    "be_payees": []
  }
}

with open("clone/src/state/initial_mock_data.json", "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)

print("Generated exact match initial_mock_data.json!")
