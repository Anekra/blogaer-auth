class CustomError extends Error {
  status: number;
  info: { status: string; error: string };

  constructor(status: number, info: { status: string; error: string }) {
    super(info.error);
    this.status = status;
    this.info = info;
    Object.setPrototypeOf(this, CustomError.prototype);
  }
}
