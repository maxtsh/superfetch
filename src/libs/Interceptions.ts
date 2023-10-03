class Interception<T> {
  handlers: T[] = [];

  constructor(defaultInterceptors: T[] = []) {
    this.handlers = defaultInterceptors;
  }

  use(fn: T) {
    this.handlers.push(fn);
    return this.handlers.length - 1;
  }

  remove(index: number) {
    this.handlers.splice(index, 1);
  }

  clear() {
    this.handlers = [];
  }
}

export default Interception;
