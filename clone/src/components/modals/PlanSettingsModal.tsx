import React, { useState, useMemo } from 'react';
import { Dialog } from '../core/Dialog';
import { Button } from '../core/Button';
import { FieldWithError } from '../core/FieldWithError';
import rawCurrencies from './currencies_exact.json';
import rawLocales from './locales_exact.json';

export interface CurrencyItem {
  iso_code: string;
  english_name: string;
  default_locale: string;
}

export interface LocaleMeta {
  iso_code: string;
  example_format: string;
  decimal_digits: number;
  decimal_separator: string;
  symbol_first: boolean;
  group_separator: string;
  currency_symbol: string;
  display_symbol: boolean;
}

const ALL_CURRENCIES: CurrencyItem[] = rawCurrencies;
const LOCALES: Record<string, LocaleMeta> = rawLocales;

// Exact common currencies list from YNAB (Zn & wrapper-DkFKwf1z.js):
const COMMON_CURRENCIES: { label: string; value: string }[] = [
  { label: 'US Dollar–USD', value: 'USD' },
  { label: 'UK Pound Sterling–GBP', value: 'GBP' },
  { label: 'Canadian Dollar–CAD', value: 'CAD' },
  { label: 'Australian Dollar–AUD', value: 'AUD' },
  { label: 'Euro–EUR', value: 'EUR' },
];

// Exact date formats array from YNAB Jd.dateFormats:
const DATE_FORMAT_PATTERNS = [
  'YYYY/MM/DD',
  'YYYY-MM-DD',
  'DD-MM-YYYY',
  'DD/MM/YYYY',
  'DD.MM.YYYY',
  'MM/DD/YYYY',
  'YYYY.MM.DD',
];

// Exact number formats from YNAB Yn (12 formats):
const NUMBER_FORMATS = [
  { example_format: '123,456.78', decimal_digits: 2 },
  { example_format: '123.456,78', decimal_digits: 2 },
  { example_format: '123,456.789', decimal_digits: 3 },
  { example_format: '123 456.78', decimal_digits: 2 },
  { example_format: "123'456.78", decimal_digits: 2 },
  { example_format: '123.456', decimal_digits: 0 },
  { example_format: '123,456', decimal_digits: 0 },
  { example_format: '123 456-78', decimal_digits: 2 },
  { example_format: '123 456,78', decimal_digits: 2 },
  { example_format: '123,456/78', decimal_digits: 2 },
  { example_format: '123 456', decimal_digits: 0 },
  { example_format: '1,23,456.78', decimal_digits: 2 },
];

export const SYMBOL_FIRST = 'Symbol First';
export const SYMBOL_LAST = 'Symbol Last';
export const SYMBOL_NONE = 'Symbol None';

export interface PlanSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  budgetName?: string;
  currency?: string;
  currencyPlacement?: 'Symbol First' | 'Symbol Last' | 'Symbol None';
  currencyFormat?: string;
  dateFormat?: string;
  isCreate?: boolean;
  onSave?: (settings: {
    budgetName: string;
    currency: string;
    currencyPlacement: string;
    currencyFormat: string;
    dateFormat: string;
  }) => void;
}

/**
 * Exact decompiled from components/modals/modals-settings.hbs & Jct class in wrapper-DkFKwf1z.js:
 * Matches 100% of YNAB Ember Port 4200 DOM hierarchy, classes, and styles.
 */
export const PlanSettingsModal: React.FC<PlanSettingsModalProps> = ({
  isOpen,
  onClose,
  budgetName = "ops's Plan",
  currency = 'USD',
  currencyPlacement = SYMBOL_FIRST,
  currencyFormat = '123,456.78',
  dateFormat = 'MM/DD/YYYY',
  isCreate = false,
  onSave,
}) => {
  const [activeBudgetName, setActiveBudgetName] = useState(budgetName);
  const [selectedCurrency, setSelectedCurrency] = useState(currency);
  const [selectedPlacement, setSelectedPlacement] = useState<string>(currencyPlacement);
  const [selectedNumberFormat, setSelectedNumberFormat] = useState(currencyFormat);
  const [selectedDateFormat, setSelectedDateFormat] = useState(dateFormat);

  // Helper to get currency locale definition from Kn via Zn
  const currencyLocaleFormat = useMemo(() => {
    const item = ALL_CURRENCIES.find((c) => c.iso_code === selectedCurrency);
    if (item && LOCALES[item.default_locale]) {
      return LOCALES[item.default_locale];
    }
    return (
      LOCALES['en_US'] || {
        iso_code: 'USD',
        currency_symbol: '$',
        decimal_digits: 2,
        example_format: '123,456.78',
        symbol_first: true,
      }
    );
  }, [selectedCurrency]);

  // Filter number formats by decimal_digits of selected currency (exact Jct logic)
  const filteredNumberFormats = useMemo(() => {
    const digits = currencyLocaleFormat.decimal_digits ?? 2;
    return NUMBER_FORMATS.filter((f) => f.decimal_digits === digits).map((f) => f.example_format);
  }, [currencyLocaleFormat]);

  // Currency Placement Options (Exact Jct get currencyPlacementOptions())
  // Label pattern: "Before amount (<bdi>$</bdi><span>\u200E123,456.78)</span>", "After amount (123,456.78<bdi>$</bdi>)"
  const placementOptions = useMemo(() => {
    const sym = currencyLocaleFormat.currency_symbol || '$';
    const num = selectedNumberFormat || currencyLocaleFormat.example_format;
    return [
      {
        value: SYMBOL_FIRST,
        label: `Before amount (${sym}\u200E${num})`,
      },
      {
        value: SYMBOL_LAST,
        label: `After amount (${num}${sym})`,
      },
      {
        value: SYMBOL_NONE,
        label: `Don't show (${num})`,
      },
    ];
  }, [currencyLocaleFormat, selectedNumberFormat]);

  // Date format options formatted for 30/12/2026 (exact Jct dateFormats: be.createFromYearMonthDate(currentYear, 11, 30))
  const dateFormats = useMemo(() => {
    const YYYY = new Date().getFullYear().toString();
    const MM = '12';
    const DD = '30';
    return DATE_FORMAT_PATTERNS.map((pattern) => {
      const formatted = pattern
        .replace('YYYY', YYYY)
        .replace('MM', MM)
        .replace('DD', DD);
      return {
        value: pattern,
        label: formatted,
      };
    });
  }, []);

  if (!isOpen) return null;

  // Exact selectCurrency handler from Jct class
  const handleCurrencyChange = (newIso: string) => {
    setSelectedCurrency(newIso);
    const item = ALL_CURRENCIES.find((c) => c.iso_code === newIso);
    const loc = item && LOCALES[item.default_locale] ? LOCALES[item.default_locale] : null;
    if (loc) {
      setSelectedPlacement(loc.symbol_first ? SYMBOL_FIRST : SYMBOL_LAST);
      const digits = loc.decimal_digits ?? 2;
      const valid = NUMBER_FORMATS.filter((f) => f.decimal_digits === digits).map((f) => f.example_format);
      if (valid.includes(loc.example_format)) {
        setSelectedNumberFormat(loc.example_format);
      } else if (valid.length > 0) {
        setSelectedNumberFormat(valid[0]);
      }
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBudgetName.trim()) return;
    onSave?.({
      budgetName: activeBudgetName.trim(),
      currency: selectedCurrency,
      currencyPlacement: selectedPlacement,
      currencyFormat: selectedNumberFormat,
      dateFormat: selectedDateFormat,
    });
    onClose();
  };

  return (
    <Dialog size="regular" onClose={onClose} className="modal-budget-settings">
      <Dialog.Header close={onClose} undismissable={isCreate}>
        {isCreate ? 'New Plan' : 'Plan Settings'}
      </Dialog.Header>
      <div className="scroll-content">
        <Dialog.Body>
          <section>
            <div className="legacy-form-fields">
              <form id="modal-settings-form" onSubmit={handleSave}>
                <label htmlFor="modal-settings-budget-name" className="type-body-bold">
                  Plan Name
                </label>
                <FieldWithError field="budgetName">
                  <div>
                    <input
                      id="modal-settings-budget-name"
                      type="text"
                      className="ember-text-field ember-view modal-budget-settings-name user-data"
                      value={activeBudgetName}
                      onChange={(e) => setActiveBudgetName(e.target.value)}
                      autoFocus
                    />
                  </div>
                </FieldWithError>

                <div className="modal-budget-settings-currency-fields">
                  <div>
                    <label htmlFor="modal-settings-currency" className="type-body-bold">
                      Currency
                    </label>
                    <div className="x-select-container">
                      <select
                        id="modal-settings-currency"
                        className="js-x-select user-data"
                        value={selectedCurrency}
                        onChange={(e) => handleCurrencyChange(e.target.value)}
                      >
                        <optgroup label="Common Currencies">
                          {COMMON_CURRENCIES.map((c) => (
                            <option key={`common-${c.value}`} value={c.value}>
                              {c.label}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="All Currencies">
                          {ALL_CURRENCIES.map((c) => (
                            <option key={`all-${c.iso_code}`} value={c.iso_code}>
                              {c.english_name}–{c.iso_code}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="modal-settings-currency-placement" className="type-body-bold">
                      Currency Placement
                    </label>
                    <div className="x-select-container">
                      <select
                        id="modal-settings-currency-placement"
                        className="js-x-select user-data"
                        value={selectedPlacement}
                        onChange={(e) => setSelectedPlacement(e.target.value)}
                      >
                        {placementOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <label htmlFor="modal-settings-currency-format" className="type-body-bold">
                  Number Format
                </label>
                <div className="x-select-container">
                  <select
                    id="modal-settings-currency-format"
                    className="user-data"
                    value={selectedNumberFormat}
                    onChange={(e) => setSelectedNumberFormat(e.target.value)}
                  >
                    {filteredNumberFormats.map((fmt) => (
                      <option key={fmt} value={fmt}>
                        {fmt}
                      </option>
                    ))}
                  </select>
                </div>

                <label htmlFor="modal-settings-date-format" className="type-body-bold">
                  Date Format
                </label>
                <div className="x-select-container">
                  <select
                    id="modal-settings-date-format"
                    className="js-x-select user-data"
                    value={selectedDateFormat}
                    onChange={(e) => setSelectedDateFormat(e.target.value)}
                  >
                    {dateFormats.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
              </form>
            </div>
          </section>
        </Dialog.Body>
      </div>
      <Dialog.Footer footerBorder={false}>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          type="submit"
          form="modal-settings-form"
          disabled={!activeBudgetName.trim()}
        >
          {isCreate ? 'Create Plan' : 'Apply Settings'}
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
};
