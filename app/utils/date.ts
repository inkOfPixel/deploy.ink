import dayjs from "dayjs";
import calendar from "dayjs/plugin/calendar";

dayjs.extend(calendar);

export function getHumanReadableDateTime(date: dayjs.Dayjs) {
  return date.calendar(null, {
    sameDay: "[Today at] H:mm:ss",
    nextDay: "[Tomorrow at] H:mm:ss",
    nextWeek: "dddd [at] H:mm:ss",
    lastDay: "[Yesterday at] H:mm:ss",
    lastWeek: "[Last] dddd [at] H:mm:ss",
    sameElse: "DD/MM/YYYY [at] H:mm:ss",
  });
}
