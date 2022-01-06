import { Context, Formatters, InterpolationFields } from "@u27n/core/runtime";
import { VNode } from "preact";

export class PreactContext extends Context {
	public constructor(...args: ConstructorParameters<typeof Context>) {
		super(...args);
		this.T = this.T.bind(this);
	}

	public T(props: PreactContext.TProps): VNode {
		return <>{this.t(props.value as string, props, props.id!)}</>;
	}
}

export declare namespace PreactContext {
	export type TProps = (TPluralProps | TSimpleProps) & TBaseProps;

	export interface TBaseProps {
		id: string;
		fields?: InterpolationFields;
		formatters?: Formatters;
	}

	export interface TPluralProps {
		value: string[];
		count: number;
	}

	export interface TSimpleProps {
		value: string;
	}
}
