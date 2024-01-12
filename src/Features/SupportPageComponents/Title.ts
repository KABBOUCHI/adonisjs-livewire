import { Decorator } from "../SupportDecorators/Decorator";

export default class Title extends Decorator {
    constructor(public title: string) {
        super();
    }

    async render( view) {
        view.share({
            title:  this.title
        })
    }

}