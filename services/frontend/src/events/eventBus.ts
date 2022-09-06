const eventBus = {
  on(
    event: string,
    callback: { (data: any): void; (data: any): void; (arg: any): any }
  ) {
    document.addEventListener(event, (e) => callback(e));
  },
  dispatch(
    event: string,
    data: { message: { id: string } | { data: any } | { node: any } }
  ) {
    document.dispatchEvent(new CustomEvent(event, { detail: data }));
  },
  remove(
    event: string,
    callback: { (): void; (this: Document, ev: any): any }
  ) {
    document.removeEventListener(event, callback);
  }
};

export default eventBus;
