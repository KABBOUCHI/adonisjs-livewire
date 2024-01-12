import { Decorator } from './Decorator';
import { BaseComponent } from "../../BaseComponent";

export class HandlesDecorators extends BaseComponent{
  public __decorators: Decorator[]

  public getDecorators() {
    return this.__decorators ?? [];
  }

  public addDecorator(decorator: Decorator) {
    if (!this.__decorators) this.__decorators = [];

    this.__decorators.push(decorator);
  }
}