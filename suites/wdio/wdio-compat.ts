export function transformRequest(requestOptions: RequestInit): RequestInit {
  if (requestOptions.headers instanceof Headers) {
    requestOptions.headers.delete('Content-Length');
    requestOptions.headers = Object.fromEntries(requestOptions.headers.entries());
  }

  return requestOptions;
}
