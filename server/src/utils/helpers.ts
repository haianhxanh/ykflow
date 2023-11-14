export const getBusinessDatesCount = (start: string, end: string) => {
  let count = 0;
  let startDate = new Date(start);
  let endDate = new Date(end);
  while (startDate <= endDate) {
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
  let future_month = new Date(startDate).getMonth() + 1;
  let future_date = new Date(startDate).getDate();
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
