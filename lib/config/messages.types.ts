export type MessageType = 'error' | 'info' | 'warning';

export interface Message {
  type: MessageType;
  message: string;
}
