import { BaseComponent } from "../../BaseComponent";
import { store } from "../../store";

export class HandlesEvents extends BaseComponent {
    public getListeners(): { [key: string]: string } {
        return {};
    }

    public dispatch(name: string, params: any, to?: string) {
        store(this).push('dispatched', {
            name,
            params,
            to,
        })
    }
}