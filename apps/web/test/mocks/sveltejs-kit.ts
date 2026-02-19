/**
 * Mock for @sveltejs/kit functions used in server routes.
 * redirect() throws a Redirect error (matching SvelteKit's behavior).
 * fail() returns an ActionFailure object.
 */

class Redirect {
  status: number;
  location: string;
  constructor(status: number, location: string) {
    this.status = status;
    this.location = location;
  }
}

class ActionFailure<T = unknown> {
  status: number;
  data: T;
  constructor(status: number, data: T) {
    this.status = status;
    this.data = data;
  }
}

export function redirect(status: number, location: string): never {
  throw new Redirect(status, location);
}

export function fail<T>(status: number, data: T): ActionFailure<T> {
  return new ActionFailure(status, data);
}

export function isRedirect(e: unknown): e is Redirect {
  return e instanceof Redirect;
}

export function isActionFailure(e: unknown): e is ActionFailure {
  return e instanceof ActionFailure;
}

export { Redirect, ActionFailure };
