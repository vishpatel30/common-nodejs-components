import { Admin, Consumer, Producer } from 'kafkajs';

export interface Client {
  admin: Admin;
  producer: Producer;
  consumer: Consumer;
}
