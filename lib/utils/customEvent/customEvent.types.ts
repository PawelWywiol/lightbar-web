export interface CustomEventDispatch<T = unknown> {
  name: string;
  detail: T;
}

export interface CustomEventCallback<T extends CustomEventDispatch> {
  name: T['name'];
  callback: (event: CustomEvent<T['detail']>) => void;
}
