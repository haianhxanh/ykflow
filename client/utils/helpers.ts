import { STATUS, STATUS_STRINGS } from "./constants";

export const getBusinessDatesCount = (start: string, end: string) => {
  let count = 0;
  let startDate = new Date(convertDate(start));
  let endDate = new Date(convertDate(end));
  while (startDate < endDate) {
    const dayOfWeek = startDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
    startDate.setDate(startDate.getDate() + 1);
  }
  return count;
};

export const getFutureBusinessDate = (start: string, days: number) => {
  let count = 0;
  let startDate = new Date(convertDate(start));
  while (count < days) {
    startDate.setDate(startDate.getDate() + 1);
    if (startDate.getDay() != 0 && startDate.getDay() != 6) count++;
  }
  let future_year = new Date(startDate).getFullYear();
  let future_month = new Date(startDate).getMonth() + 1;
  let future_date = new Date(startDate).getDate();
  return `${future_date}-${future_month}-${future_year}`;
};

export const convertDate = (date: string) => {
  let dateArray = date.split("-");
  return `${dateArray[1]}-${dateArray[0]}-${dateArray[2]}`;
};

export const convertDateToISOString = (date: string) => {
  let dateArray = date.split("-");
  return `${dateArray[2]}-${dateArray[1]}-${dateArray[0]}`;
};

export const parseInquiryStatus = (status: string) => {
  let parsedString;
  switch (status) {
    case STATUS.NEW:
      parsedString = STATUS_STRINGS.NEW;
      break;
    case STATUS.APPROVED:
      parsedString = STATUS_STRINGS.APPROVED;
      break;
    case STATUS.DECLINED:
      parsedString = STATUS_STRINGS.DECLINED;
      break;
    default:
      parsedString = "";
  }

  return parsedString;
};

export const updateInquiryStatus = async (id: string, status: string) => {
  let statusString: any;
  if (status == STATUS.APPROVED) statusString = STATUS.APPROVED;
  if (status == STATUS.DECLINED) statusString = STATUS.DECLINED;
  const body = {
    id: id,
    status: statusString,
  };

  const jsonBody = JSON.stringify(body);

  const res = await fetch(
    process.env.NEXT_PUBLIC_URL_UPDATE_INQUIRIES as string,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${
          process.env.NEXT_PUBLIC_APP_SECRET_KEY as string
        }`,
        "Content-Type": "application/json",
      },
      body: jsonBody,
    }
  );

  const message = await res.json();
  return message;
};

export const deleteInquiry = async (id: string) => {
  const body = {
    id: id,
  };

  const jsonBody = JSON.stringify(body);

  const res = await fetch(
    process.env.NEXT_PUBLIC_URL_DELETE_INQUIRIES as string,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${
          process.env.NEXT_PUBLIC_APP_SECRET_KEY as string
        }`,
        "Content-Type": "application/json",
      },
      body: jsonBody,
    }
  );

  const message = await res.json();
  return message;
};

export const get_inquiries = async () => {
  const res = await fetch(process.env.NEXT_PUBLIC_URL_GET_INQUIRIES as string, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${
        process.env.NEXT_PUBLIC_APP_SECRET_KEY as string
      }`,
    },
  });

  const data = await res.json();
  return data;
};
