"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getYesterday = exports.isWeekDay = exports.convertDateToLocalString = exports.convertDateToISOString = exports.convertDate = exports.getFutureBusinessDate = exports.getBusinessDatesCount = void 0;
const getBusinessDatesCount = (start, end) => {
    // start date is included in the count
    // end date is not included in the count
    let count = 0;
    let startDate = new Date(start);
    let endDate = new Date(end);
    while (startDate < endDate) {
        const dayOfWeek = startDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6)
            count++;
        startDate.setDate(startDate.getDate() + 1);
    }
    return count;
};
exports.getBusinessDatesCount = getBusinessDatesCount;
const getFutureBusinessDate = (start, days) => {
    let count = 0;
    let startDate = new Date(start);
    while (count < days) {
        startDate.setDate(startDate.getDate() + 1);
        if (startDate.getDay() != 0 && startDate.getDay() != 6)
            count++;
    }
    let future_year = new Date(startDate).getFullYear();
    let future_month = String(new Date(startDate).getMonth() + 1).padStart(2, "0");
    let future_date = String(new Date(startDate).getDate()).padStart(2, "0");
    return `${future_year}-${future_month}-${future_date}`;
};
exports.getFutureBusinessDate = getFutureBusinessDate;
const convertDate = (date) => {
    let dateArray = date.split("-");
    return `${dateArray[1]}-${dateArray[0]}-${dateArray[2]}`;
};
exports.convertDate = convertDate;
const convertDateToISOString = (date) => {
    let dateArray = date.split("-");
    return `${dateArray[2]}-${dateArray[1]}-${dateArray[0]}`;
};
exports.convertDateToISOString = convertDateToISOString;
const convertDateToLocalString = (date) => {
    let dateArray = date.split("-");
    return `${dateArray[2]}.${dateArray[1]}.${dateArray[0]}`;
};
exports.convertDateToLocalString = convertDateToLocalString;
const isWeekDay = (date) => {
    let day = new Date(date).getDay();
    if (day !== 0 && day !== 6)
        return true;
    return false;
};
exports.isWeekDay = isWeekDay;
const getYesterday = () => {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date.toISOString().split("T")[0];
};
exports.getYesterday = getYesterday;
