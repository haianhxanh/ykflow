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
