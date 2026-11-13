// Monthly/annual price toggle. Annual billing is 20% off the monthly price.
type Period = "monthly" | "annual";

const ANNUAL_DISCOUNT = 0.2;

function formatPrice(monthly: number, period: Period): string {
  const value = period === "annual" ? monthly * (1 - ANNUAL_DISCOUNT) : monthly;
  return Number.isInteger(value) ? `$${value}` : `$${value.toFixed(2)}`;
}

function setPeriod(period: Period): void {
  document.querySelectorAll<HTMLButtonElement>(".billing-toggle button").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.period === period));
  });
  document.querySelectorAll<HTMLElement>(".price[data-monthly]").forEach((price) => {
    const monthly = Number(price.dataset.monthly);
    const suffix = period === "annual" ? "/ month, billed yearly" : "/ month";
    price.innerHTML = `${formatPrice(monthly, period)} <small>${suffix}</small>`;
  });
}

document.querySelectorAll<HTMLButtonElement>(".billing-toggle button").forEach((button) => {
  button.addEventListener("click", () => setPeriod(button.dataset.period as Period));
});
