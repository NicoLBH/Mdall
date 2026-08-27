import { svgIcon } from "../../ui/icons.js";
import { escapeHtml } from "../../utils/escape-html.js";

const MONTH_FORMATTER = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });
const INPUT_FORMATTER = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function parseSharedDateInputValue(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toSharedDateInputValue(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatSharedDateInputValue(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return INPUT_FORMATTER.format(date);
}

export function formatSharedDateLong(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return MONTH_FORMATTER.format(date);
}

export function shiftSharedCalendarMonth(year, month, delta) {
  const base = new Date(Number(year), Number(month), 1);
  base.setMonth(base.getMonth() + Number(delta || 0));
  return { year: base.getFullYear(), month: base.getMonth() };
}

export function getSharedCalendarMatrix(year, month) {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  const weeks = [];
  for (let w = 0; w < 6; w += 1) {
    const week = [];
    for (let d = 0; d < 7; d += 1) {
      const cell = new Date(start);
      cell.setDate(start.getDate() + (w * 7) + d);
      week.push({
        date: cell,
        inMonth: cell.getMonth() === month,
        value: toSharedDateInputValue(cell),
        day: cell.getDate()
      });
    }
    weeks.push(week);
  }
  return weeks;
}

export function renderSharedDatePicker({
  idBase,
  value = "",
  selectedDate = null,
  viewYear,
  viewMonth,
  isOpen = false,
  placeholder = "Select a date",
  inputLabel = "",
  calendarLabel = "Select a date",
  /**
   * Navigation par année, en plus des mois.
   *
   * Optionnelle, et désactivée par défaut : les appelants existants ne
   * connaissent que `-prev` et `-next`, et afficher des boutons qu'ils ne
   * savent pas traiter donnerait des commandes mortes. Remonter trois ans en
   * arrière demandait sinon trente-six clics.
   */
  showYearNav = false
} = {}) {
  const matrix = getSharedCalendarMatrix(viewYear, viewMonth);
  const todayValue = toSharedDateInputValue(new Date());
  const selectedValue = value || toSharedDateInputValue(selectedDate);
  return `
    <div class="shared-date-picker">
      <button
        type="button"
        class="shared-date-picker__trigger"
        data-shared-date-input-trigger="${escapeHtml(idBase)}"
        aria-expanded="${isOpen ? "true" : "false"}"
        aria-haspopup="dialog"
      >
        <span class="shared-date-picker__trigger-icon" aria-hidden="true">${svgIcon("calendar", { className: "octicon octicon-calendar Anchor-module__calendarIcon__VUKUY" })}</span>
        <span class="shared-date-picker__trigger-label">${escapeHtml(inputLabel || placeholder)}</span>
      </button>
      <input type="hidden" id="${escapeHtml(idBase)}" value="${escapeHtml(selectedValue || "")}">
      ${isOpen ? `
        <div class="shared-date-picker__popover" role="dialog" aria-label="${escapeHtml(calendarLabel)}">
          <div class="shared-date-picker__calendar">
            <div class="shared-date-picker__calendar-head">
              ${showYearNav ? `<button type="button" class="shared-date-picker__nav" data-shared-date-nav="${escapeHtml(idBase)}-year-prev" aria-label="Année précédente">&#x00AB;</button>` : ""}
              <button type="button" class="shared-date-picker__nav" data-shared-date-nav="${escapeHtml(idBase)}-prev" aria-label="Mois précédent">&#x2039;</button>
              <div class="shared-date-picker__month-label">${escapeHtml(formatSharedDateLong(new Date(viewYear, viewMonth, 1)))}</div>
              <button type="button" class="shared-date-picker__nav" data-shared-date-nav="${escapeHtml(idBase)}-next" aria-label="Mois suivant">&#x203A;</button>
              ${showYearNav ? `<button type="button" class="shared-date-picker__nav" data-shared-date-nav="${escapeHtml(idBase)}-year-next" aria-label="Année suivante">&#x00BB;</button>` : ""}
            </div>
            <div class="shared-date-picker__weekdays">
              ${WEEKDAY_LABELS.map((label) => `<span>${escapeHtml(label)}</span>`).join("")}
            </div>
            <div class="shared-date-picker__days">
              ${matrix.map((week) => week.map((cell) => {
                const classes = ["shared-date-picker__day"];
                if (!cell.inMonth) classes.push("is-outside");
                if (cell.value === selectedValue) classes.push("is-selected");
                if (cell.value === todayValue) classes.push("is-today");
                return `<button type="button" class="${classes.join(" ")}" data-shared-date-owner="${escapeHtml(idBase)}" data-shared-date-day="${escapeHtml(cell.value)}">${cell.day}</button>`;
              }).join("")).join("")}
            </div>
            <div class="shared-date-picker__footer">
              <button type="button" class="shared-date-picker__footer-action" data-shared-date-clear="${escapeHtml(idBase)}">Clear</button>
              <button type="button" class="shared-date-picker__footer-action" data-shared-date-today="${escapeHtml(idBase)}">Today</button>
            </div>
          </div>
        </div>
      ` : ""}
    </div>
  `;
}
