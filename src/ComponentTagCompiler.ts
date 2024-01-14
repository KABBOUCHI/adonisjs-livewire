import { ApplicationContract } from '@ioc:Adonis/Core/Application'
import { existsSync } from "fs";

const SELF_CLOSING_REGEX = /<x-([a-zA-Z0-9\.\-]+)([^>]*)\/>/g;
const OPENING_REGEX = /<x-([a-zA-Z0-9\.\-]+)([^>]*)>([\s\S]*?(?:(?!<\/x-\1>).)*?)<\/x-\1>/g;

export class ComponentTagCompiler {
    static compileSelfClosingTags(input: string, app?: ApplicationContract): string {
        let raw = input;
        let matches = input.match(SELF_CLOSING_REGEX);

        if (!matches) {
            return raw;
        }

        for (const match of matches) {
            let [_, component, props] = match.match(/<x-([a-zA-Z0-9\.\-]+)([^>]*)\/>/) || [];
            let attributes: any = {};
            if (props) {
                let regex = /(:)?([a-zA-Z0-9\-:]+)\s*=\s*['"]([^'"]*)['"]/g;

                let matches = props.match(regex);
                if (matches) {
                    for (const match of matches) {
                        let [_, prefix, key, value] = match.match(/(:)?([a-zA-Z0-9\-:]+)\s*=\s*['"]([^'"]*)['"]/) || [];
                        if (prefix === ':') {
                            attributes[key] = `_____${value}_____`
                        }
                        else {
                            attributes[key] = value
                        }
                    }
                }
            }
            const attrs = JSON.stringify(attributes).replace(/"_____([^"]*)_____"/g, "$1")

            let componentPath = component.replace(/\./g, '/');

            if (app) {
                if (!existsSync(app.viewsPath(componentPath + '.edge'))) {
                    componentPath = `components/${componentPath}`

                    if (!existsSync(app.viewsPath(componentPath + '.edge'))) {
                        componentPath = componentPath + '/index'
                    }
                }
            }
            raw = raw.replace(match, `@!component('${componentPath}', ${attrs})`);

        }
        return raw;
    }

    static compileOpeningTags(input: string, app?: ApplicationContract): string {
        let raw = input;

        let matches = raw.match(OPENING_REGEX);

        if (!matches) {
            return raw;
        }
        for (const match of matches) {
            let [_, component, props, content] = match.match(/<x-([a-zA-Z0-9\.\-]+)([^>]*)>([\s\S]*?(?:(?!<\/x-\1>).)*?)<\/x-\1>/) || [];

            let attributes: any = {};
            if (props) {
                let regex = /(:)?([a-zA-Z0-9\-:]+)\s*=\s*['"]([^'"]*)['"]/g;

                let matches = props.match(regex);
                if (matches) {
                    for (const match of matches) {
                        let [_, prefix, key, value] = match.match(/(:)?([a-zA-Z0-9\-:]+)\s*=\s*['"]([^'"]*)['"]/) || [];
                        if (prefix === ':') {
                            attributes[key] = `_____${value}_____`
                        }
                        else {
                            attributes[key] = value
                        }
                    }
                }
            }
            const attrs = JSON.stringify(attributes).replace(/"_____([^"]*)_____"/g, "$1")

            let componentPath = component.replace(/\./g, '/');

            if (app) {
                if (!existsSync(app.viewsPath(componentPath + '.edge'))) {
                    componentPath = `components/${componentPath}`

                    if (!existsSync(app.viewsPath(componentPath + '.edge'))) {
                        componentPath = componentPath + '/index'
                    }
                }
            }

            raw = raw.replace(match, `@component('${componentPath}', ${attrs}) ${content} @end`);
        }

        if(raw.match(OPENING_REGEX)) {
            raw = ComponentTagCompiler.compileOpeningTags(raw, app);
        }

        return raw;
    }

    static compile(input: string, app?: ApplicationContract): string {
        return [this.compileSelfClosingTags, this.compileOpeningTags].reduce((raw, fn) => {
            return fn(raw, app);
        }, input)
    }
}