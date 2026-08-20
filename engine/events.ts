import type { EventListener, GameEvent } from './types';

export class EventEmitter {
  private listeners: EventListener[] = [];

  on(listener: EventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  emit(event: GameEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}
