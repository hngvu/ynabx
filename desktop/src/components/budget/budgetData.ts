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

export const INITIAL_CATEGORY_GROUPS: MasterCategoryGroup[] = [];
