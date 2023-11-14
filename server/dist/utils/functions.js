"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertDate = exports.getBusinessDatesCount = void 0;
const getBusinessDatesCount = (start, end) => {
    let count = 0;
    let startDate = new Date((0, exports.convertDate)(start));
    let endDate = new Date((0, exports.convertDate)(end));
    while (startDate <= endDate) {
        const dayOfWeek = startDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6)
            count++;
        startDate.setDate(startDate.getDate() + 1);
    }
    return count;
};
exports.getBusinessDatesCount = getBusinessDatesCount;
const convertDate = (date) => {
    let dateArray = date.split("-");
    return `${dateArray[1]}-${dateArray[0]}-${dateArray[2]}`;
};
exports.convertDate = convertDate;
