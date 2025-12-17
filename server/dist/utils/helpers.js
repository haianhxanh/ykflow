"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWeekWorkDates = exports.getNextNextWeekMondayToFriday = exports.getThisWeekMondayToFriday = exports.getWorkDatesBetweenDates = exports.czechDate = exports.getWeekNumber = exports.getLastSundayAndPrecedingMonday = exports.setProgramLengthWord = exports.getYesterday = exports.isWeekDay = exports.convertDateToLocalString = exports.convertDateToISOString = exports.convertDate = exports.getFutureBusinessDate = exports.getBusinessDatesCount = void 0;
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
const setProgramLengthWord = (programLength) => {
    if (programLength === 1)
        return `${programLength} den`;
    if (programLength === 2 || programLength === 3 || programLength === 4)
        return `${programLength} dny`;
    return `${programLength} dní`;
};
exports.setProgramLengthWord = setProgramLengthWord;
const getLastSundayAndPrecedingMonday = () => {
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
exports.getLastSundayAndPrecedingMonday = getLastSundayAndPrecedingMonday;
const getWeekNumber = (mondayDate) => {
    let date = new Date(mondayDate);
    date.setHours(0, 0, 0, 0);
    let firstThursday = new Date(date.getFullYear(), 0, 4);
    firstThursday.setDate(firstThursday.getDate() - ((firstThursday.getDay() + 6) % 7));
    let diff = Math.round((date.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000));
    return diff + 1;
};
exports.getWeekNumber = getWeekNumber;
const czechDate = (date) => {
    const dateObj = new Date(date);
    const day = dateObj.getDate();
    const month = dateObj.getMonth() + 1;
    const year = dateObj.getFullYear();
    return `${day}.${month}.${year}`;
};
exports.czechDate = czechDate;
const getWorkDatesBetweenDates = (startDate, endDate) => {
    let start = new Date(startDate);
    let end = new Date(endDate);
    let workDates = [];
    while (start < end) {
        if (start.getDay() !== 0 && start.getDay() !== 6)
            workDates.push(start.toISOString().split("T")[0]);
        start.setDate(start.getDate() + 1);
    }
    return workDates;
};
exports.getWorkDatesBetweenDates = getWorkDatesBetweenDates;
const getThisWeekMondayToFriday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysToMonday);
    return Array.from({ length: 5 }, (_, i) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        return formatDate(date);
    });
};
exports.getThisWeekMondayToFriday = getThisWeekMondayToFriday;
const getNextNextWeekMondayToFriday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay();
    const daysToThisMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const thisMonday = new Date(today);
    thisMonday.setDate(today.getDate() - daysToThisMonday);
    const nextNextMonday = new Date(thisMonday);
    nextNextMonday.setDate(thisMonday.getDate() + 14);
    return Array.from({ length: 5 }, (_, i) => {
        const date = new Date(nextNextMonday);
        date.setDate(nextNextMonday.getDate() + i);
        return formatDate(date);
    });
};
exports.getNextNextWeekMondayToFriday = getNextNextWeekMondayToFriday;
const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};
const getWeekWorkDates = (mondayDate) => {
    const monday = new Date(mondayDate);
    const weekWorkDates = [];
    for (let i = 0; i < 5; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        weekWorkDates.push(formatDate(date));
    }
    return weekWorkDates;
};
exports.getWeekWorkDates = getWeekWorkDates;
