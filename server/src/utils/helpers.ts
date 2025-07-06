export const getBusinessDatesCount = (start: string, end: string) => {
  // start date is included in the count
  // end date is not included in the count
  let count = 0;
  let startDate = new Date(start);
  let endDate = new Date(end);
  while (startDate < endDate) {
    const dayOfWeek = startDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
    startDate.setDate(startDate.getDate() + 1);
  }
  return count;
};

export const getFutureBusinessDate = (start: string, days: number) => {
  let count = 0;
  let startDate = new Date(start);
  while (count < days) {
    startDate.setDate(startDate.getDate() + 1);
    if (startDate.getDay() != 0 && startDate.getDay() != 6) count++;
  }
  let future_year = new Date(startDate).getFullYear();
  let future_month = String(new Date(startDate).getMonth() + 1).padStart(2, "0");
  let future_date = String(new Date(startDate).getDate()).padStart(2, "0");
  return `${future_year}-${future_month}-${future_date}`;
};

export const convertDate = (date: string) => {
  let dateArray = date.split("-");
  return `${dateArray[1]}-${dateArray[0]}-${dateArray[2]}`;
};

export const convertDateToISOString = (date: string) => {
  let dateArray = date.split("-");
  return `${dateArray[2]}-${dateArray[1]}-${dateArray[0]}`;
};

export const convertDateToLocalString = (date: string) => {
  let dateArray = date.split("-");
  return `${dateArray[2]}.${dateArray[1]}.${dateArray[0]}`;
};

export const isWeekDay = (date: string) => {
  let day = new Date(date).getDay();
  if (day !== 0 && day !== 6) return true;
  return false;
};

export const getYesterday = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().split("T")[0];
};

export const setProgramLengthWord = (programLength: number) => {
  if (programLength === 1) return `${programLength} den`;
  if (programLength === 2 || programLength === 3 || programLength === 4) return `${programLength} dny`;
  return `${programLength} dní`;
};

export const getLastSundayAndPrecedingMonday = () => {
  let today = new Date();
  let dayOfWeek = today.getDay();
  let lastSunday = new Date(today);
  lastSunday.setDate(today.getDate() - dayOfWeek - (dayOfWeek === 0 ? 7 : 0));
  let precedingMonday = new Date(lastSunday);
  precedingMonday.setDate(lastSunday.getDate() - 6);

  return {
    precedingMonday: precedingMonday.toISOString().split("T")[0],
    lastSunday: lastSunday.toISOString().split("T")[0],
  };
};

export const getWeekNumber = (mondayDate: string) => {
  let date = new Date(mondayDate);
  date.setHours(0, 0, 0, 0);
  let firstThursday = new Date(date.getFullYear(), 0, 4);
  firstThursday.setDate(firstThursday.getDate() - ((firstThursday.getDay() + 6) % 7));
  let diff = Math.round((date.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return diff + 1;
};

export const czechDate = (date: string) => {
  const dateObj = new Date(date);
  const day = dateObj.getDate();
  const month = dateObj.getMonth() + 1;
  const year = dateObj.getFullYear();
  return `${day}.${month}.${year}`;
};

export const getWorkDatesBetweenDates = (startDate: string, endDate: string) => {
  let start = new Date(startDate);
  let end = new Date(endDate);
  let workDates = [];
  while (start < end) {
    if (start.getDay() !== 0 && start.getDay() !== 6) workDates.push(start.toISOString().split("T")[0]);
    start.setDate(start.getDate() + 1);
  }
  return workDates;
};
