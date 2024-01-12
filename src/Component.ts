import { Mixin } from 'ts-mixer';
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { HandlesEvents } from './Features/SupportEvents/HandlesEvents';
import { HandlesDecorators } from './Features/SupportDecorators/HandlesDecorators';
import { HandlesRedirects } from './Features/SupportRedirects/HandlesRedirects';
import { HandlesPageComponents } from './Features/SupportPageComponents/HandlesPageComponents';
import { HandlesJsEvaluation } from './Features/SupportJsEvaluation/HandlesJsEvaluation';

interface ComponentOptions {
    ctx: HttpContextContract | null;
    id: string;
    name: string;
}

export class Component extends Mixin( HandlesEvents, HandlesRedirects, HandlesDecorators, HandlesPageComponents, HandlesJsEvaluation) {
    constructor({ ctx, id, name }: ComponentOptions) {
        super();

        this.__ctx = ctx;
        this.__id = id;
        this.__name = name;
    }
}