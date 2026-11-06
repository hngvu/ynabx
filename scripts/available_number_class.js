alIcon && !this.showSnoozeIcon)
            return `${a} ${this.budgetGoalsService.buildGoalMessage(
              this.args.category,
              !0
            )}`;
          if (0 === r) return "";
          const o = this.args.category.isCreditCardPaymentCategory
            ? r > 0
              ? "tooltip.budget.positivePayment"
              : "tooltip.budget.negativePayment"
            : r > 0
            ? "tooltip.budget.positiveBalance"
            : "tooltip.budget.negativeBalance";
          return Ho(o, { available: a });
        }
        get currencyClass() {
          const e = this.args.category,
            t = e?.inspector;
          if (!e || !t) return null;
          const n = t.balanceState;
          return `${Jm(n)} ${
            this.budgetService.isDifferentiateWithoutColorOn
              ? "alternative"
              : ""
          }`;
        }
        get showSnoozeIcon() {
          return this.showGoalIcon && this.args.category.isGoalSnoozed;
        }
        get showGoalIcon() {
          const e = this.currencyClass,
            { budgetMonth: t, goalCreatedOn: n } = this.args.category;
          return !(
            e?.includes(Km.Negative) ||
            null === n ||
            (t && t.isBeforeMonth(n)) ||
            !this.args.category.goalType
          );
        }
        get showCreditIcon() {
          return this.currencyClass?.includes(Km.CautiousCredit);
        }
        get showUpcomingIcon() {
          return this.currencyClass?.includes(Km.CautiousUpcoming);
        }
        get isDisabled() {
          const {
            isMasterCategory: e,
            isUncategorizedCategory: t,
            isHiddenCategory: n,
            available: i,
          } = this.args.category;
          return e || t || n || 0 === i;
        }
        get ariaDisabled() {
          return this.isDisabled ? "true" : "false";
        }
        onClick(e) {
          (0 == this.budgetService.checkedRowsCount &&
            this.args.category.isCreditCardPaymentCategory) ||
            (e.preventDefault(), e.stopPropagation());
          const t = this.isDisabled,
            n = this.args.category,
            i = n.available;
          if (t) return;
          if (this.args.onClick) return void this.args.onClick(e);
          const r = i > 0 ? "budget/move-money" : "budget/overspending";
          this.budgetService.openBudgetModal(
            r,
            { triggerElement: $(e.target) },
            { category: n }
          );
        }
        static {
          Dc(this.prototype, "onClick", [W]);
        }
        static {
          a(
            le({
              id: null,
              block:
                '[[[11,"button"],[16,0,[29,["ynab-new-budget-available-number js-budget-available-number user-data\\n        ",[30,0,["currencyClass"]],"\\n        ",[52,[30,0,["budgetService","isDifferentiateWithoutColorOn"]],"alternative"]]]],[16,"title",[30,0,["title"]]],[16,"aria-disabled",[30,0,["ariaDisabled"]]],[16,"disabled",[30,0,["isDisabled"]]],[24,4,"button"],[4,[32,0],["click",[30,0,["onClick"]]],null],[12],[1,"\\n"],[41,[30,0,["showCreditIcon"]],[[[1,"        "],[1,[28,[32,1],["budget-available-number/icon-credit"],null]],[1,"\\n"]],[]],[[[41,[30,0,["showUpcomingIcon"]],[[[1,"        "],[1,[28,[32,1],["budget-available-number/icon-upcoming"],null]],[1,"\\n"]],[]],[[[41,[30,0,["showSnoozeIcon"]],[[[1,"        "],[1,[28,[32,1],["budget-available-number/icon-snooze"],null]],[1,"\\n"]],[]],[[[41,[30,0,["showGoalIcon"]],[[[1,"        "],[8,[32,2],null,[["@percentageComplete"],[[30,1,["goalPercentageComplete"]]]],null],[1,"\\n    "]],[]],null]],[]]]],[]]]],[]]],[1,"    "],[1,[28,[32,3],[[30,1,["available"]]],[["currencyClass"],[[30,0,["currencyClass"]]]]]],[1,"\\n"],[13]],["@category"],["if"]]',
              moduleName:
                "/home/runner/_work/evergreen/evergreen/ynab_web/app/components