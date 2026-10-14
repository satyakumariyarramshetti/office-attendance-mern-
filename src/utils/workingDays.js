//src/utils/workingDays.js
export const calculateWorkingDays = (
  records,
  festivalHolidays,
  selectedMonth,
  selectedYear,
) => {
  const month = Number(selectedMonth);
  const year = Number(selectedYear);

  if (!month || !year) {
    return {
      totalDays: 0,
      holidays: 0,
      workingDays: 0,
      workingDaysTillDate: 0,
      holidayDates: [],
    };
  }

  const totalDays = new Date(year, month, 0).getDate();

  const holidayMap = new Map();

  // -----------------------------------------
  // 1. Holidays already available in records
  // -----------------------------------------
  records.forEach((record) => {
    const date = new Date(record.date);

    if (
      date.getFullYear() !== year ||
      date.getMonth() + 1 !== month ||
      !record.holidayName
    ) {
      return;
    }

    const key = `${year}-${String(month).padStart(2, "0")}-${String(
      date.getDate(),
    ).padStart(2, "0")}`;

    holidayMap.set(key, record.holidayName);
  });

  // -----------------------------------------
  // 2. Festival holidays
  // -----------------------------------------
  festivalHolidays.forEach((holiday) => {
    if (!holiday.date || !holiday.name) return;

    const [holidayYear, holidayMonth, holidayDay] = holiday.date
      .split("-")
      .map(Number);

    if (holidayYear !== year || holidayMonth !== month || !holidayDay) {
      return;
    }

    const key = holiday.date;

    holidayMap.set(key, holidayMap.get(key) || holiday.name);
  });

  // -----------------------------------------
  // 3. Weekly offs
  //    Sunday
  //    Second Saturday
  // -----------------------------------------
  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(year, month - 1, day);

    const key = `${year}-${String(month).padStart(2, "0")}-${String(
      day,
    ).padStart(2, "0")}`;

    // Sunday
    if (date.getDay() === 0) {
      holidayMap.set(key, holidayMap.get(key) || "SUNDAY");
    }

    // Second Saturday
    else if (date.getDay() === 6 && Math.ceil(day / 7) === 2) {
      holidayMap.set(key, holidayMap.get(key) || "2nd SATURDAY");
    }
  }

  // -----------------------------------------
  // 4. Total working days for entire month
  // -----------------------------------------
  const holidays = holidayMap.size;

  const workingDays = totalDays - holidays;

  // -----------------------------------------
  // 5. Working days till today
  // -----------------------------------------
  const today = new Date();

  let workingDaysTillDate = 0;

  const selectedMonthIsCurrentMonth =
    year === today.getFullYear() && month === today.getMonth() + 1;

  const selectedMonthIsPast =
    year < today.getFullYear() ||
    (year === today.getFullYear() && month < today.getMonth() + 1);

  // Current month
  // Exclude today because today's attendance is not complete yet.
  // Working Days Till Date means completed working days only.
  if (selectedMonthIsCurrentMonth) {
    const currentDay = today.getDate();

    for (let day = 1; day < currentDay; day++) {
      const key = `${year}-${String(month).padStart(2, "0")}-${String(
        day,
      ).padStart(2, "0")}`;

      if (!holidayMap.has(key)) {
        workingDaysTillDate++;
      }
    }
  }

  // Previous month
  else if (selectedMonthIsPast) {
    workingDaysTillDate = workingDays;
  }

  // Future month
  else {
    workingDaysTillDate = 0;
  }

  return {
    totalDays,
    holidays,
    workingDays,
    workingDaysTillDate,
    holidayDates: [...holidayMap.entries()],
  };
};
