
import ComponentContext from "../../ComponentContext";
import { Decorator } from "../SupportDecorators/Decorator";

export default class Url extends Decorator {
    constructor(public name: string) {
        super();
    }

    public mount() 
    {
      let value = this.component.ctx.request.input(this.name);

      this.component[this.name] = value;
    }

    public dehydrate(context: ComponentContext)
    {   
        if (!context.mounting) return;

        let queryString = {
            'as' : null,
            'use' :'replace',
            'alwaysShow' : false,
            'except' : null,
        };

        context.pushEffect('url', queryString, this.name);
    }
}