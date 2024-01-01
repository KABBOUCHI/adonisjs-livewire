export class Component {
    protected __id;
    protected __name;

    public id() {
        return this.getId();
    }

    public setId($id) {
        this.__id = $id;
    }

    public getId() {
        return this.__id;
    }

    public setName($name) {
        this.__name = $name;
    }

    public getName() {
        return this.__name;
    }

    public async render(): Promise<string> {
        return '<div></div>';
    }

    public async data() : Promise<any> {
        return {};
    }
}