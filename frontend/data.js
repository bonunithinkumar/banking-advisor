const plansData = [
  {
    sno: 1,
    bank_name: "SBI",
    scheme_name: "Monthly Income Scheme",
    min_amount: 1000,
    max_amount: "No upper limit",
    min_tenure_months: 7,
    max_tenure_months: 120,
    interest_rate: "3.50% - 7.60%",
    payout_type: "Monthly",
    interest_payout_mode: "Monthly credit",
    senior_citizen_bonus: "Additional 0.5%",
    risk_level: "",
    pre_maturity_penalty: "Penalty as per bank's guidelines",
    description: "A term deposit scheme offering monthly interest payouts. Special schemes like Amrit Kalash and Amrit Vrishti offer higher interest rates for specific tenures.",
    source_link: "https://www.smcinsurance.com/fd-interest-rates/articles/sbi-monthly-income-schemes",
    plan_type: "Monthly"
  },
  {
    sno: 2,
    bank_name: "Bank of Baroda",
    scheme_name: "Monthly Income Plan",
    min_amount: 1000,
    max_amount: "No upper limit",
    min_tenure_months: 12,
    max_tenure_months: 120,
    interest_rate: "6.50% - 7.75%",
    payout_type: "Monthly",
    interest_payout_mode: "Monthly credit",
    senior_citizen_bonus: "Additional 0.5%",
    risk_level: "",
    pre_maturity_penalty: "1% penalty if withdrawn before maturity; No penalty for deposits up to ₹5 lakh if held for at least 12 months",
    description: "A fixed deposit plan that pays monthly interest, providing a fixed income every month. Auto-renewal option available; Loan/overdraft up to 95% of the deposit amount available.",
    source_link: "https://www.bankofbaroda.in/personal-banking/accounts/term-deposit/fixed-deposit/monthly-income-plan",
    plan_type: "Monthly"
  },
  // Rest of the plans would follow the same pattern...
  // Including all 22 plans from the Excel file
];

export default plansData;