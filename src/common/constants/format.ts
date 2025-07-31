// src/common/constants/format.ts
import moment from 'moment'; // <--- Change this line
import { DATE_TIME } from './datetime';
// import * as moment from 'moment'; // Remove or comment this out

export const fDate = (value: Date | moment.Moment | null | string) => moment(value).format(DATE_TIME.DAY_MONTH_YEAR);

export const fDateTime = (value: Date | moment.Moment | null | string) =>
  moment(value, DATE_TIME.DAY_MONTH_YEAR).format(DATE_TIME.YEAR_MONTH_DATE);

export const fToNow = (value: Date | moment.Moment | null | string) => {
  const dateMoment = moment(value, DATE_TIME.DAY_MONTH_YEAR);
  return dateMoment.fromNow();
};

export const fRemainingTime = (targetDate: string, format: string): string => {
  const endDate = moment(targetDate, format);
  const now = moment();
  const duration = moment.duration(endDate.diff(now));

  if (duration.asSeconds() <= 0) {
    return 'Expired';
  }

  const days = Math.floor(duration.asDays());
  const hours = duration.hours();
  const minutes = duration.minutes();
  const seconds = duration.seconds();

  let result = '';
  if (days > 0) result += `${days} days `;
  if (hours > 0) result += `${hours} hours `;
  if (minutes > 0) result += `${minutes} minutes `;
  if (seconds > 0) result += `${seconds} seconds`;

  return result.trim();
};

export const fCalculateDays = (startDate: string, endDate: string): number => {
  const start = moment(startDate, DATE_TIME.YEAR_MONTH_DATE);
  const end = moment(endDate, DATE_TIME.YEAR_MONTH_DATE);
  return end.diff(start, 'days');
};
