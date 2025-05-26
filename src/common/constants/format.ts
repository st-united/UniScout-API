import * as moment from 'moment';
import { DATE_TIME } from './datetime';

export const formatDate = (date: string) => `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;

export const fDate = (value: Date | moment.Moment | null | string) => moment(value).format(DATE_TIME.DAY_MONTH_YEAR);

export const toDateData = (value: Date | moment.Moment | null | string) =>
  moment(value, DATE_TIME.DAY_MONTH_YEAR).format(DATE_TIME.YEAR_MONTH_DATE);

export const toDateDataAdd1Day = (value: Date | moment.Moment | null | string) => {
  const dateMoment = moment(value, DATE_TIME.DAY_MONTH_YEAR);
  const nextDayMoment = dateMoment.add(1, 'day');
  return nextDayMoment.format(DATE_TIME.YEAR_MONTH_DATE);
};

export const daysRemaining = (targetDate: string): number => {
  const format = DATE_TIME.DAY_MONTH_YEAR;

  const endDate = moment(targetDate, format);

  const now = moment();

  const oneDay = 24 * 60 * 60 * 1000;
  const diff = endDate.diff(now);

  const daysRemaining = Math.ceil(diff / oneDay);

  return daysRemaining;
};

export const differentDays = (startDate: Date, endDate: Date): number => {
  const start = moment(startDate, DATE_TIME.YEAR_MONTH_DATE);
  const end = moment(endDate, DATE_TIME.YEAR_MONTH_DATE);

  const duration = moment.duration(end.diff(start));
  return duration.asDays() + 1;
};

export const getLastTheoryDate = (startDate: Date, theoryDays: number) => {
  const lastTheoryDate = new Date(startDate.getTime());
  lastTheoryDate.setDate(startDate.getDate() + theoryDays);
  lastTheoryDate.setHours(23);
  lastTheoryDate.setMinutes(59);
  lastTheoryDate.setSeconds(59);
  lastTheoryDate.setMilliseconds(999);
  return lastTheoryDate;
};
