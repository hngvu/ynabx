import { CategoryTarget } from './categoryTargetStatus';

export interface SubCategoryItem {
  entityId: string;
  name: string;
  assigned: number; // milliunits
  activity: number; // milliunits
  available: number; // milliunits
  target?: CategoryTarget;
  goalTarget?: number;
  goalType?: string;
  goalProgress?: number; // 0 to 1
  isDebtPayment?: boolean;
  isGoalSnoozed?: boolean;
  isHidden?: boolean;
  note?: string;
}

export interface MasterCategoryGroup {
  entityId: string;
  name: string;
  isDebtPaymentGroup?: boolean;
  isCollapsed?: boolean;
  isHidden?: boolean;
  categories: SubCategoryItem[];
}

export const INITIAL_CATEGORY_GROUPS: MasterCategoryGroup[] = [
  {
    entityId: 'grp-credit-cards',
    name: 'Credit Card Payments',
    isDebtPaymentGroup: true,
    isCollapsed: false,
    categories: [
      {
        entityId: 'cat-cc-visa',
        name: 'Visa Rewards',
        assigned: 0,
        activity: 0,
        available: 0,
        isDebtPayment: true,
      },
    ],
  },
  {
    entityId: 'grp-bills',
    name: 'Bills',
    isCollapsed: false,
    categories: [
      {
        entityId: 'cat-rent',
        name: 'Rent',
        assigned: 1200000,
        activity: -1200000,
        available: 0,
        target: {
          targetAmount: 1200000,
          targetType: 'NEED',
          dayOfMonth: 1,
        },
      },
      {
        entityId: 'cat-electric',
        name: 'Electric',
        assigned: 120000,
        activity: -95000,
        available: 25000,
        target: {
          targetAmount: 120000,
          targetType: 'NEED',
          dayOfMonth: 15,
        },
      },
      {
        entityId: 'cat-internet',
        name: 'Internet',
        assigned: 65000,
        activity: -65000,
        available: 0,
        target: {
          targetAmount: 65000,
          targetType: 'NEED',
          dayOfMonth: 20,
        },
      },
      {
        entityId: 'cat-phone',
        name: 'Phone',
        assigned: 45000,
        activity: -45000,
        available: 0,
        target: {
          targetAmount: 45000,
          targetType: 'NEED',
          dayOfMonth: 25,
        },
      },
      {
        entityId: 'cat-subscriptions',
        name: 'Subscriptions',
        assigned: 30000,
        activity: -28990,
        available: 1010,
        target: {
          targetAmount: 30000,
          targetType: 'NEED',
        },
      },
      {
        entityId: 'cat-car-insurance',
        name: 'Car Insurance',
        assigned: 100000,
        activity: 0,
        available: 100000,
        target: {
          targetAmount: 100000,
          targetType: 'NEED',
        },
      },
    ],
  },
  {
    entityId: 'grp-needs',
    name: 'Needs',
    isCollapsed: false,
    categories: [
      {
        entityId: 'cat-groceries',
        name: 'Groceries',
        assigned: 350000,
        activity: -200000,
        available: 150000,
        target: {
          targetAmount: 500000,
          targetType: 'NEED',
        },
      },
      {
        entityId: 'cat-gas',
        name: 'Gas',
        assigned: 100000,
        activity: -110000,
        available: -10000, // overspent example
        target: {
          targetAmount: 150000,
          targetType: 'NEED',
        },
      },
      {
        entityId: 'cat-health',
        name: 'Health & Pharmacy',
        assigned: 50000,
        activity: -25000,
        available: 25000,
      },
      {
        entityId: 'cat-household',
        name: 'Household',
        assigned: 80000,
        activity: -45000,
        available: 35000,
      },
      {
        entityId: 'cat-car-payment',
        name: 'Car Payment',
        assigned: 250000,
        activity: -250000,
        available: 0,
        target: {
          targetAmount: 250000,
          targetType: 'NEED',
          dayOfMonth: 10,
        },
      },
      {
        entityId: 'cat-farmers-market',
        name: 'Farmers Market',
        assigned: 50000,
        activity: 0,
        available: 50000,
      },
    ],
  },
  {
    entityId: 'grp-wants',
    name: 'True Expenses & Wants',
    isCollapsed: false,
    categories: [
      {
        entityId: 'cat-dining',
        name: 'Dining Out',
        assigned: 200000,
        activity: -185000,
        available: 15000,
        target: {
          targetAmount: 200000,
          targetType: 'NEED',
        },
      },
      {
        entityId: 'cat-vacation',
        name: 'Vacation',
        assigned: 100000,
        activity: 0,
        available: 100000,
        target: {
          targetAmount: 1200000,
          targetType: 'TB',
        },
      },
      {
        entityId: 'cat-entertainment',
        name: 'Entertainment',
        assigned: 75000,
        activity: -50000,
        available: 25000,
      },
      {
        entityId: 'cat-clothing',
        name: 'Clothing',
        assigned: 50000,
        activity: 0,
        available: 50000,
      },
      {
        entityId: 'cat-home-repair',
        name: 'Home Maintenance',
        assigned: 100000,
        activity: 0,
        available: 100000,
      },
    ],
  },
];
