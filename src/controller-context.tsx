import { U27N } from "@u27n/core/runtime";
import { Component, RenderableProps, VNode } from "preact";

export class ControllerContext extends Component<ControllerContext.Props> {
	#onUpdate = () => this.forceUpdate();

	public render(props: ControllerContext.Props): VNode {
		return <>{props.children}</>;
	}

	public componentDidMount(): void {
		this.props.u27n.updateHandlers.add(this.#onUpdate);
	}

	public componentWillUnmount(): void {
		this.props.u27n.updateHandlers.delete(this.#onUpdate);
	}
}

export declare namespace ControllerContext {
	export type Props = RenderableProps<{
		u27n: U27N;
	}>;
}
