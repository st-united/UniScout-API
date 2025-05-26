import { IsArray } from 'class-validator';

export class ResponseItem<T> {
  @IsArray()
  readonly data: T[] | T;

  readonly message: string;

  constructor(data: T[] | T, message: string) {
    this.data = data;
    this.message = message;
  }
}
