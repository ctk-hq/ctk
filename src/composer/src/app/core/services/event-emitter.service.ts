import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class EventEmitterService {

  constructor() { }

  events = {};
  api = {
    broadcast: this.broadcast,
    subscribe: this.subscribe
  };

  broadcast(event, data) {
    if (!this.events[event]) return;

    this.events[event].forEach(callback => {

      return callback(data);
    });
  }

  subscribe(eventName, callback) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }

    this.events[eventName].push(callback);

    return this.generateUnsubscribe(eventName, callback);
  }

  generateUnsubscribe(eventName, callback) {
    const _this = this;
    return function unsubscribe() {
      var callbacks = _this.events[eventName];

      for(var i = 0; i < callbacks.length; i++) {
        if (callbacks[i] == callback) {
          callbacks.splice(i, 1);
          return;
        }
      }
    };
  }
}
