export function success(data: any, pagination?: any) {
  return {
    success: true,
    ...(pagination ? { data, pagination } : { data }),
  };
}

export function error(message: string, code?: string) {
  return {
    success: false,
    error: message,
    ...(code ? { code } : {}),
  };
}

export function pagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}
