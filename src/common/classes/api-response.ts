interface Response<T> {
  success?: boolean;
  message?: string;
  data: T;
}

export class ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string | object;

  constructor(args: Response<T>) {
    this.data = args.data;
    this.success = args.success ?? true;
    this.message = args.message ?? 'Request successful';
  }
}
